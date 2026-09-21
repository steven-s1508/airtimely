import { sql } from "../../db/index.js";
import type { JobSummary } from "../../lib/jobRuns.js";
import { countryCodeOf, reverseGeocode } from "../../lib/nominatim.js";
import { slugify } from "../../lib/slugify.js";
import type { EntityData } from "../../lib/themeparks.js";
import { themeparks } from "../../lib/themeparks.js";

type ExistingRow = {
	id: string;
	name: string;
	timezone: string | null;
	external_id: string | null;
	country_code: string | null;
	has_geocode: boolean;
	is_destination?: boolean | null;
};

/**
 * Fills country_code/geocode_data only when they are missing. A park does not move,
 * so one lookup per entity, ever.
 */
async function geocodeIfMissing(
	existing: ExistingRow | undefined,
	entity: EntityData,
): Promise<{ geocode: unknown; countryCode: string | null } | null> {
	if (existing?.has_geocode) return null;
	const lat = entity.location?.latitude;
	const lon = entity.location?.longitude;
	if (typeof lat !== "number" || typeof lon !== "number") return null;

	const geocode = await reverseGeocode(lat, lon);
	if (!geocode) return null;
	return { geocode, countryCode: countryCodeOf(geocode) };
}

async function upsertDestination(entity: EntityData, dryRun: boolean): Promise<string | null> {
	const [existing] = await sql<ExistingRow[]>`
		select id, name, timezone, external_id, country_code,
			   (geocode_data is not null) as has_geocode
		from destinations where external_id = ${entity.id}
	`;

	const geo = await geocodeIfMissing(existing, entity);

	if (dryRun) return existing?.id ?? null;

	if (existing) {
		await sql`
			update destinations set
				name = ${entity.name},
				slug = ${entity.slug || slugify(entity.name)},
				timezone = ${entity.timezone},
				latitude = ${entity.location?.latitude ?? null},
				longitude = ${entity.location?.longitude ?? null},
				geocode_data = coalesce(${geo ? sql.json(geo.geocode as never) : null}, geocode_data),
				country_code = coalesce(${geo?.countryCode ?? null}, country_code),
				updated_at = now()
			where id = ${existing.id}
		`;
		return existing.id;
	}

	const [inserted] = await sql<{ id: string }[]>`
		insert into destinations (
			id, name, slug, timezone, external_id, latitude, longitude, geocode_data, country_code
		) values (
			gen_random_uuid(), ${entity.name}, ${entity.slug || slugify(entity.name)},
			${entity.timezone}, ${entity.id},
			${entity.location?.latitude ?? null}, ${entity.location?.longitude ?? null},
			${geo ? sql.json(geo.geocode as never) : null}, ${geo?.countryCode ?? null}
		)
		returning id
	`;
	return inserted!.id;
}

async function upsertPark(
	entity: EntityData,
	destinationId: string | null,
	isDestination: boolean,
	dryRun: boolean,
): Promise<"inserted" | "updated" | "unchanged"> {
	const [existing] = await sql<ExistingRow[]>`
		select id, name, timezone, external_id, country_code, is_destination,
			   (geocode_data is not null) as has_geocode
		from parks where external_id = ${entity.id}
	`;

	const geo = await geocodeIfMissing(existing, entity);
	if (dryRun) return existing ? "unchanged" : "inserted";

	if (!existing) {
		await sql`
			insert into parks (
				id, destination_id, name, slug, entity_type, timezone, external_id,
				latitude, longitude, geocode_data, country_code, is_destination, is_active
			) values (
				gen_random_uuid(), ${destinationId}, ${entity.name},
				${entity.slug || slugify(entity.name)}, 'PARK', ${entity.timezone}, ${entity.id},
				${entity.location?.latitude ?? null}, ${entity.location?.longitude ?? null},
				${geo ? sql.json(geo.geocode as never) : null}, ${geo?.countryCode ?? null},
				${isDestination}, true
			)
		`;
		return "inserted";
	}

	/**
	 * v1 only wrote an update when name, external_id or is_destination changed — so a
	 * park whose **timezone** changed in the API was silently never updated, even
	 * though the field was in the update object. Timezone decides every park-local
	 * bucket boundary, so it is included here.
	 */
	const changed =
		existing.name !== entity.name ||
		existing.timezone !== entity.timezone ||
		(existing.is_destination ?? false) !== isDestination;

	if (!changed && !geo) return "unchanged";

	await sql`
		update parks set
			destination_id = coalesce(${destinationId}, destination_id),
			name = ${entity.name},
			slug = ${entity.slug || slugify(entity.name)},
			timezone = ${entity.timezone},
			latitude = ${entity.location?.latitude ?? null},
			longitude = ${entity.location?.longitude ?? null},
			geocode_data = coalesce(${geo ? sql.json(geo.geocode as never) : null}, geocode_data),
			country_code = coalesce(${geo?.countryCode ?? null}, country_code),
			is_destination = ${isDestination},
			is_active = true,
			updated_at = now()
		where id = ${existing.id}
	`;
	return "updated";
}

/**
 * Syncs destinations and parks from the API.
 *
 * Parks that disappear from the API are deactivated, never deleted: their rides carry
 * years of statistics, and a park dropping out of a response is far more likely to be
 * an upstream hiccup than a closure.
 */
export async function parkSync(options: { dryRun?: boolean } = {}): Promise<JobSummary> {
	const dryRun = options.dryRun ?? false;
	const response = await themeparks.destinations();
	const destinations = response.destinations ?? [];

	let destinationsSeen = 0;
	let inserted = 0;
	let updated = 0;
	let unchanged = 0;
	let timezoneChanges = 0;
	const seenParkExternalIds: string[] = [];
	const failures: string[] = [];

	for (const entry of destinations) {
		try {
			const entity = await themeparks.entity(entry.id);
			const destinationId = await upsertDestination(entity, dryRun);
			destinationsSeen++;

			// A destination with exactly one park is presented as the park itself.
			const isDestination = (entry.parks?.length ?? 0) === 1;

			for (const park of entry.parks ?? []) {
				try {
					const parkEntity = await themeparks.entity(park.id);
					seenParkExternalIds.push(park.id);

					const [before] = await sql<{ timezone: string | null }[]>`
						select timezone from parks where external_id = ${park.id}
					`;
					if (before && before.timezone !== parkEntity.timezone) {
						timezoneChanges++;
						console.warn(
							`[park_sync] timezone changed for ${parkEntity.name}: ` +
								`${before.timezone} -> ${parkEntity.timezone}`,
						);
					}

					const outcome = await upsertPark(parkEntity, destinationId, isDestination, dryRun);
					if (outcome === "inserted") inserted++;
					else if (outcome === "updated") updated++;
					else unchanged++;
				} catch (error) {
					failures.push(`park ${park.name}: ${error instanceof Error ? error.message : error}`);
				}
			}
		} catch (error) {
			failures.push(`destination ${entry.name}: ${error instanceof Error ? error.message : error}`);
		}
	}

	let deactivated = 0;
	// Only when the whole sweep succeeded: a partial listing would deactivate the world.
	if (!dryRun && failures.length === 0 && seenParkExternalIds.length > 0) {
		const rows = await sql<{ id: string }[]>`
			update parks set is_active = false, updated_at = now()
			where is_active
				and external_id is not null
				and not (external_id = any(${seenParkExternalIds}))
			returning id
		`;
		deactivated = rows.length;
	}

	return {
		dryRun,
		destinationsSeen,
		parksSeen: seenParkExternalIds.length,
		inserted,
		updated,
		unchanged,
		deactivated,
		timezoneChanges,
		failureCount: failures.length,
		failures: failures.slice(0, 20),
	};
}
