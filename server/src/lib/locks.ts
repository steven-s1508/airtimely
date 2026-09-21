import { sql } from "../db/index.js";

/**
 * Runs `fn` while holding a Postgres advisory lock, or returns `notRun` if another
 * process already holds it.
 *
 * The lock must live on one connection for its whole lifetime, so a connection is
 * reserved out of the pool rather than borrowed per statement. This is what makes a
 * slow job unable to overlap its own next tick, or a second worker container.
 */
export async function withAdvisoryLock<T>(
	name: string,
	fn: () => Promise<T>,
): Promise<{ ran: true; result: T } | { ran: false; result: null }> {
	const reserved = await sql.reserve();
	try {
		const [row] = await reserved<{ locked: boolean }[]>`
			select pg_try_advisory_lock(hashtext(${name})) as locked
		`;
		if (!row?.locked) return { ran: false, result: null };

		try {
			return { ran: true, result: await fn() };
		} finally {
			await reserved`select pg_advisory_unlock(hashtext(${name}))`;
		}
	} finally {
		reserved.release();
	}
}
