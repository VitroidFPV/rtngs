export type ImageResult = { url: string; title: string }

export async function searchImages(
	brand: string,
	name: string,
	fetcher: typeof fetch = fetch,
): Promise<ImageResult[]> {
	const query = `${brand.trim()} ${name.trim()}`.trim()
	const headers = { "User-Agent": "Mozilla/5.0 (rtngs image search)" }
	const searchUrl = new URL("https://duckduckgo.com/")
	searchUrl.search = new URLSearchParams({
		q: query,
		iax: "images",
		ia: "images",
	}).toString()
	const page = await fetcher(searchUrl, {
		headers,
		signal: AbortSignal.timeout(15000),
	})
	if (!page.ok) throw new Error("Image search failed")
	const token = (await page.text()).match(/vqd=['"]?([^&'"\\]+)/)?.[1]
	if (!token) throw new Error("Image search did not return a token")
	const endpoint = new URL("https://duckduckgo.com/i.js")
	endpoint.search = new URLSearchParams({
		l: "us-en",
		o: "json",
		q: query,
		vqd: token,
		f: ",,,",
		p: "1",
		s: "0",
	}).toString()
	const response = await fetcher(endpoint, {
		headers: { ...headers, Referer: "https://duckduckgo.com/" },
		signal: AbortSignal.timeout(15000),
	})
	if (!response.ok) throw new Error("Image search failed")
	const data = (await response.json()) as {
		results?: { title?: unknown; image?: unknown }[]
	}
	if (!Array.isArray(data.results))
		throw new Error("Invalid image search response")
	const results: ImageResult[] = []
	const seen = new Set<string>()
	for (const result of data.results) {
		const url = result?.image
		if (typeof url !== "string" || url.length > 2000 || seen.has(url))
			continue
		try {
			if (!["http:", "https:"].includes(new URL(url).protocol)) continue
		} catch {
			continue
		}
		seen.add(url)
		results.push({
			url,
			title:
				typeof result.title === "string" && result.title.trim()
					? result.title.trim()
					: query,
		})
		if (results.length === 12) break
	}
	return results
}
