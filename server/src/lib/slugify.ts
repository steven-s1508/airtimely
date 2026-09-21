/** URL-safe slug, matching the shape v1's sync produced so existing slugs are stable. */
export function slugify(value: string): string {
	return value
		.toString()
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^\w-]+/g, "")
		.replace(/--+/g, "-")
		.replace(/^-+/, "")
		.replace(/-+$/, "");
}
