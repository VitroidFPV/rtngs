import { ConvexError } from "convex/values"

export function text(
	value: string,
	label: string,
	max: number,
	required = false,
) {
	const cleaned = value.trim()
	if ((required && !cleaned) || cleaned.length > max)
		throw new ConvexError(
			`${label} must be ${required ? "1" : "0"}-${max} characters.`,
		)
	return cleaned
}
export function productFields(input: {
	name: string
	brand: string
	description: string
	url: string
	tags: string[]
}) {
	const url = text(input.url, "Link", 2000)
	if (url) {
		let parsed: URL
		try {
			parsed = new URL(url)
		} catch {
			throw new ConvexError("Enter a valid product link.")
		}
		if (!["https:", "http:"].includes(parsed.protocol))
			throw new ConvexError("Use an http or https link.")
	}
	if (input.tags.length > 10) throw new ConvexError("Use up to 10 tags.")
	return {
		name: text(input.name, "Name", 120, true),
		brand: text(input.brand, "Brand", 80),
		description: text(input.description, "Description", 2000),
		url,
		tags: [
			...new Set(
				input.tags.map((tag) =>
					text(tag.toLowerCase(), "Tag", 32, true),
				),
			),
		].sort(),
	}
}
export function ratingFields(score: number, note: string) {
	if (!Number.isInteger(score) || score < 1 || score > 5)
		throw new ConvexError("Choose a whole-number rating from 1 to 5.")
	return { score, note: text(note, "Review", 1000) }
}
