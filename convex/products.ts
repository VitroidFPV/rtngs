import { ConvexError, v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { productFields, ratingFields } from "./lib/validation"
import { member } from "./lib/access"
import { authComponent } from "./auth"

export const list = query({
	args: {},
	handler: async (ctx) => {
		const user = await member(ctx)
		const avatars = new Map<string, Promise<string | undefined>>()
		function avatar(userId: string) {
			if (!avatars.has(userId))
				avatars.set(
					userId,
					authComponent
						.getAnyUserById(ctx, userId)
						.then((profile) => profile?.image ?? undefined),
				)
			return avatars.get(userId)!
		}
		const products = await ctx.db.query("products").order("desc").collect()
		return Promise.all(
			products.map(async (product) => {
				const records = await ctx.db
					.query("ratings")
					.withIndex("by_product", (q) =>
						q.eq("productId", product._id),
					)
					.collect()
				const ratings = await Promise.all(
					records.map(async (rating) => ({
						...rating,
						image: await avatar(rating.userId),
					})),
				)
				return {
					...product,
					canEdit: product.createdBy === user._id,
					canDelete: true,
					ratings,
					mine: ratings.find((r) => r.userId === user._id) ?? null,
					average: ratings.length
						? ratings.reduce((sum, r) => sum + r.score, 0) /
							ratings.length
						: null,
				}
			}),
		)
	},
})
const fields = {
	name: v.string(),
	brand: v.string(),
	description: v.string(),
	url: v.string(),
	imageUrl: v.optional(v.string()),
	tags: v.array(v.string()),
}
export const save = mutation({
	args: { id: v.optional(v.id("products")), ...fields },
	handler: async (ctx, args) => {
		const user = await member(ctx)
		const data = productFields(args)
		if (args.id) {
			const product = await ctx.db.get(args.id)
			if (!product || product.createdBy !== user._id)
				throw new ConvexError(
					"Only the person who added this product can edit it.",
				)
			await ctx.db.patch(args.id, data)
			return args.id
		}
		return ctx.db.insert("products", { ...data, createdBy: user._id })
	},
})
export const rate = mutation({
	args: { productId: v.id("products"), score: v.number(), note: v.string() },
	handler: async (ctx, args) => {
		const user = await member(ctx)
		const data = ratingFields(args.score, args.note)
		if (!(await ctx.db.get(args.productId)))
			throw new ConvexError("Product no longer exists.")
		const existing = await ctx.db
			.query("ratings")
			.withIndex("by_user_product", (q) =>
				q.eq("userId", user._id).eq("productId", args.productId),
			)
			.unique()
		if (existing)
			await ctx.db.patch(existing._id, { ...data, name: user.name })
		else
			await ctx.db.insert("ratings", {
				...data,
				name: user.name,
				productId: args.productId,
				userId: user._id,
			})
	},
})
export const removeRating = mutation({
	args: { productId: v.id("products") },
	handler: async (ctx, args) => {
		const user = await member(ctx)
		const rating = await ctx.db
			.query("ratings")
			.withIndex("by_user_product", (q) =>
				q.eq("userId", user._id).eq("productId", args.productId),
			)
			.unique()
		if (rating) await ctx.db.delete(rating._id)
	},
})

export const remove = mutation({
	args: { productId: v.id("products") },
	handler: async (ctx, args) => {
		await member(ctx)
		const ratings = await ctx.db
			.query("ratings")
			.withIndex("by_product", (q) => q.eq("productId", args.productId))
			.collect()
		for (const rating of ratings) await ctx.db.delete(rating._id)
		if (await ctx.db.get(args.productId))
			await ctx.db.delete(args.productId)
	},
})
