import { sql } from "../../db/index.js";
import type { JobSummary } from "../../lib/jobRuns.js";
import { slugify } from "../../lib/slugify.js";
import type { EntityChild } from "../../lib/themeparks.js";
import { themeparks } from "../../lib/themeparks.js";

/**
 * Child entity kinds we store, and the table each goes to.
 *
 * v1 fetched `/children` and threw away everything that was not an ATTRACTION, so
 * `shows` and `restaurants` were never populated by any job in the repo. The response
 * already contains them, so covering all three costs no extra requests.
 */
const TABLE_BY_TYPE = {
	ATTRACTION: "rides",
	SHOW: "shows",
	RESTAURANT: "restaurants",
} as const;

type SyncedType = keyof typeof TABLE_BY_TYPE;

type ExistingChild = {
	id: string;
	external_id: string | null;
	name: string;
	slug: string | null;
	is_active: boolean;
};

type Counts = { inserted: number; updated: number; reactivated: number; deactivated: number };

function emptyCounts(): Counts {
	return { inserted: 0, updated: 0, reactivated: 0, deactivated: 0 };
}

/**
 * Reconciles one park's entities of one kind.
 *
 * `rides` generates its own UUID; `shows` and `restaurants` take the API's id as their
 * primary key, matching how v1 defined those tables.
 */
async function syncTable(
	parkId: string,
	type: SyncedType,
	apiChildren: EntityChild[],
	counts: Counts,
): Promise<void> {
	const table = TABLE_BY_TYPE[type];

	const existing = await sql<ExistingChild[]>`
		select id, external_id, name, slug, is_active
		from ${sql(table)}
		where park_id = ${parkId}::uuid
	`;
	const byExternal = new Map(existing.filter((e) => e.external_id).map((e) => [e.external_id!, e]));

	for (const child of apiChildren) {
		const slug = child.slug || slugify(child.name);
		const current = byExternal.get(child.id);

		if (!current) {
			await sql`
				insert into ${sql(table)} (
					id, park_id, name, slug, entity_type, external_id, latitude, longitude, is_active
				) values (
					${type === "ATTRACTION" ? sql`gen_random_uuid()` : sql`${child.id}::uuid`},
					${parkId}::uuid, ${child.name}, ${slug}, ${type}, ${child.id},
					${child.location?.latitude ?? null}, ${child.location?.longitude ?? null}, true
				)
				on conflict (id) do nothing
			`;
			counts.inserted++;
			continue;
		}

		const nameChanged = current.name !== child.name;
		const slugChanged = current.slug !== slug;
		const wasInactive = !current.is_active;

		if (nameChanged || slugChanged || wasInactive) {
			await sql`
				update ${sql(table)} set
					name = ${child.name},
					slug = ${slug},
					is_active = true,
					updated_at = now()
				where id = ${current.id}
			`;
			if (wasInactive) counts.reactivated++;
			else counts.updated++;
		}
	}

	// Entities the API no longer lists are deactivated, never deleted — rides carry
	// years of statistics behind a foreign key.
	const apiIds = new Set(apiChildren.map((c) => c.id));
	const goneIds = existing
		.filter((e) => e.is_active && e.external_id && !apiIds.has(e.external_id))
		.map((e) => e.id);

	if (goneIds.length > 0) {
		await sql`
			update ${sql(table)} set is_active = false, updated_at = now()
			where id = any(${goneIds}::uuid[])
		`;
		counts.deactivated += goneIds.length;
	}
}

/**
 * Syncs rides, shows and restaurants for every active park.
 *
 * In v1 this and the park sync were two Windmill jobs both scheduled Monday 00:00, so
 * a newly added park could be synced for rides before it existed. They are one job
 * here, ordered.
 */
export async function entitySync(): Promise<JobSummary> {
	const parks = await sql<{ id: string; external_id: string; name: string }[]>`
		select id, external_id, name from parks
		where is_active and external_id is not null
		order by name
	`;

	const counts: Record<SyncedType, Counts> = {
		ATTRACTION: emptyCounts(),
		SHOW: emptyCounts(),
		RESTAURANT: emptyCounts(),
	};
	const failures: string[] = [];
	let parksProcessed = 0;

	for (const park of parks) {
		try {
			const response = await themeparks.children(park.external_id);
			const children = response.children ?? [];

			for (const type of Object.keys(TABLE_BY_TYPE) as SyncedType[]) {
				const matching = children.filter((c) => c.entityType === type);
				// An empty list still runs, so removals are noticed. But a park that
				// returned nothing at all is a bad response, not an empty park.
				if (children.length === 0) continue;
				await syncTable(park.id, type, matching, counts[type]);
			}
			parksProcessed++;
		} catch (error) {
			failures.push(`${park.name}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	return {
		parksProcessed,
		rides: { ...counts.ATTRACTION },
		shows: { ...counts.SHOW },
		restaurants: { ...counts.RESTAURANT },
		failureCount: failures.length,
		failures: failures.slice(0, 20),
	};
}
