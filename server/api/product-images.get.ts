import { ConvexHttpClient } from "convex/browser"
import { api } from "~~/convex/_generated/api"
import { searchImages } from "../utils/image-search"

export default defineEventHandler(async (event) => {
	setResponseHeader(event, "Cache-Control", "no-store")
	const authorization = getHeader(event, "authorization")
	const token = authorization?.match(/^Bearer (.+)$/i)?.[1]
	if (!token)
		throw createError({ statusCode: 401, statusMessage: "Sign in first" })

	const config = useRuntimeConfig(event)
	if (!config.public.convexUrl)
		throw createError({
			statusCode: 503,
			statusMessage: "Library is not configured",
		})
	// Each request has its own client so authentication cannot leak between users.
	const client = new ConvexHttpClient(config.public.convexUrl)
	client.setAuth(token)
	let allowed: boolean
	try {
		allowed = (await client.query(api.members.status, {})).member
	} catch {
		throw createError({
			statusCode: 401,
			statusMessage: "Could not verify session",
		})
	}
	if (!allowed)
		throw createError({ statusCode: 403, statusMessage: "Members only" })

	const { name, brand = "" } = getQuery(event)
	if (
		typeof name !== "string" ||
		!name.trim() ||
		name.length > 120 ||
		typeof brand !== "string" ||
		brand.length > 80
	)
		throw createError({
			statusCode: 400,
			statusMessage: "Invalid product name or brand",
		})
	try {
		return await searchImages(brand, name)
	} catch {
		throw createError({
			statusCode: 502,
			statusMessage: "Image search failed. Please try again.",
		})
	}
})
