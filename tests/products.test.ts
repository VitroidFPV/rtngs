import { isMember } from "../convex/lib/membership"
import { describe, expect, test } from "bun:test"
import { productFields, ratingFields } from "../convex/lib/validation"
const product = {
	name: " Coffee ",
	brand: "",
	description: "",
	url: "",
	tags: ["Coffee", "coffee", " kitchen "],
}
describe("product validation", () => {
	test("normalizes tags and trims fields", () => {
		expect(productFields(product)).toEqual({
			...product,
			name: "Coffee",
			imageUrl: "",
			tags: ["coffee", "kitchen"],
		})
	})
	test("rejects empty names and unsafe links", () => {
		expect(() => productFields({ ...product, name: " " })).toThrow()
		expect(() =>
			productFields({ ...product, url: "javascript:alert(1)" }),
		).toThrow()
	})
	test("accepts optional image links and trims them", () => {
		expect(productFields(product).imageUrl).toBe("")
		expect(
			productFields({
				...product,
				imageUrl: " https://example.com/photo.png ",
			}).imageUrl,
		).toBe("https://example.com/photo.png")
	})
	test("rejects malformed, unsafe, and oversized image links", () => {
		for (const imageUrl of [
			"invalid",
			"javascript:alert(1)",
			"data:image/png;base64,abc",
			"https://example.com/" + "a".repeat(2000),
		])
			expect(() => productFields({ ...product, imageUrl })).toThrow()
	})
	test("requires a score in half-point increments within the scale", () => {
		for (const score of [
			-0.5,
			0,
			0.25,
			5.5,
			6,
			2.25,
			NaN,
			Infinity,
			-Infinity,
		])
			expect(() => ratingFields(score, "")).toThrow()
		for (const score of [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5])
			expect(ratingFields(score, " Great ")).toEqual({
				score,
				note: "Great",
			})
	})
})

describe("private membership", () => {
	const id = "123456789012345678"
	test("fails closed for missing configuration or Discord account", () => {
		expect(isMember(id, undefined)).toBe(false)
		expect(isMember(id, "")).toBe(false)
		expect(isMember(null, id)).toBe(false)
		expect(isMember(undefined, id)).toBe(false)
		expect(isMember("", ",")).toBe(false)
	})
	test("matches exact IDs with surrounding configuration spaces", () => {
		expect(isMember(id, `987654321098765432, ${id} `)).toBe(true)
		expect(isMember(id, "123456789012345679")).toBe(false)
		expect(isMember(id, `9${id}`)).toBe(false)
		expect(isMember(id, "member@example.com")).toBe(false)
	})
})
