import { describe, expect, test } from "bun:test"
import { searchImages } from "../server/utils/image-search"

describe("image search", () => {
	test("gets a DuckDuckGo token and returns unique direct image URLs", async () => {
		const calls: URL[] = []
		const fetcher = (async (input: URL | RequestInfo) => {
			const url = new URL(String(input))
			calls.push(url)
			expect(url.searchParams.get("q")).toBe("Acme Coffee")
			if (url.pathname === "/") return new Response("vqd='test-token'")
			expect(url.pathname).toBe("/i.js")
			expect(url.searchParams.get("vqd")).toBe("test-token")
			return Response.json({
				results: [
					{
						title: "Coffee",
						image: "https://example.com/coffee.jpg",
					},
					{ image: "https://example.com/coffee.jpg" },
					{ image: "javascript:alert(1)" },
					{ url: "https://example.com/page" },
					{ image: "invalid" },
					{ image: "https://example.com/other.jpg" },
				],
			})
		}) as typeof fetch
		expect(await searchImages(" Acme ", " Coffee ", fetcher)).toEqual([
			{ title: "Coffee", url: "https://example.com/coffee.jpg" },
			{ title: "Acme Coffee", url: "https://example.com/other.jpg" },
		])
		expect(calls).toHaveLength(2)
	})
	test("handles empty results and rejects upstream failures or missing tokens", async () => {
		const fetcher = (result: Response): typeof fetch =>
			(async (input) =>
				new URL(String(input)).pathname === "/"
					? new Response('vqd="token"')
					: result) as typeof fetch
		expect(
			await searchImages(
				"",
				"Coffee",
				fetcher(Response.json({ results: [] })),
			),
		).toEqual([])
		for (const response of [
			new Response("", { status: 429 }),
			Response.json({}),
		]) {
			await expect(
				searchImages("", "Coffee", fetcher(response)),
			).rejects.toThrow()
		}
		await expect(
			searchImages(
				"",
				"Coffee",
				(async () => new Response("challenge")) as typeof fetch,
			),
		).rejects.toThrow("token")
		await expect(
			searchImages(
				"",
				"Coffee",
				(async () => new Response("", { status: 403 })) as typeof fetch,
			),
		).rejects.toThrow()
	})
})
