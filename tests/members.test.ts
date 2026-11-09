import { afterEach, beforeEach, expect, test } from "bun:test"
import { requestAccess, decide, list } from "../convex/members"
import { remove } from "../convex/products"
import type { Id } from "../convex/_generated/dataModel"
import { member } from "../convex/lib/access"
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server"
import type { MutationCtx } from "../convex/_generated/server"

const adminId = "111111111111111111"
const guestId = "222222222222222222"
const originalAdmins = process.env.ADMIN_DISCORD_IDS
const originalMembers = process.env.MEMBER_DISCORD_IDS
beforeEach(() => {
	process.env.ADMIN_DISCORD_IDS = adminId
	process.env.MEMBER_DISCORD_IDS = ""
})
afterEach(() => {
	if (originalAdmins === undefined) delete process.env.ADMIN_DISCORD_IDS
	else process.env.ADMIN_DISCORD_IDS = originalAdmins
	if (originalMembers === undefined) delete process.env.MEMBER_DISCORD_IDS
	else process.env.MEMBER_DISCORD_IDS = originalMembers
})

// Exercise real handlers and auth checks with an in-memory Convex context.
function setup() {
	const rows: Record<string, Record<string, unknown>[]> = {
		members: [],
		membershipEvents: [],
	}
	let actor: string | null = guestId
	const ctx = {
		auth: {
			getUserIdentity: async () =>
				actor
					? { subject: `user:${actor}`, sessionId: "session" }
					: null,
		},
		runQuery: async (
			_ref: unknown,
			args: { model: string; where: { field: string; value: string }[] },
		) => {
			if (args.model === "session")
				return { expiresAt: Date.now() + 60000 }
			if (args.model === "user")
				return {
					_id: `user:${actor}`,
					name: "Member",
					image: "https://cdn.discordapp.com/avatars/example.png",
				}
			if (args.model === "account") {
				const lookup = args.where.find(
					(condition) => condition.field === "accountId",
				)
				if (lookup)
					return {
						accountId: lookup.value,
						userId: `user:${lookup.value}`,
					}
				expect(args.where).toContainEqual({
					field: "userId",
					operator: "eq",
					value: `user:${actor}`,
				})
				expect(args.where).toContainEqual({
					field: "providerId",
					operator: "eq",
					value: "discord",
				})
				return { accountId: actor }
			}
		},
		db: {
			query: (table: string) => ({
				withIndex: (
					_name: string,
					select: (query: {
						eq: (field: string, value: string) => void
					}) => void,
				) => {
					let id: string
					select({
						eq: (_field: string, value: string) => {
							id = value
						},
					})
					return {
						unique: async () =>
							rows[table]!.find((row) => row.discordId === id) ??
							null,
					}
				},
				order: () => ({ collect: async () => rows[table] }),
			}),
			insert: async (table: string, row: Record<string, unknown>) => {
				const id = `${table}:${rows[table]!.length}`
				rows[table]!.push({ ...row, _id: id })
				return id
			},
			patch: async (id: string, patch: Record<string, unknown>) => {
				Object.assign(
					rows.members!.find((row) => row._id === id)!,
					patch,
				)
			},
		},
	} as unknown as MutationCtx
	return {
		ctx,
		rows,
		as: (id: string | null) => {
			actor = id
		},
	}
}
const handler = <T extends FunctionReference>(fn: T) =>
	(
		fn as unknown as {
			_handler: (
				ctx: MutationCtx,
				args: FunctionArgs<T>,
			) => Promise<FunctionReturnType<T>>
		}
	)._handler

test("requests are idempotent and guests cannot list or approve members", async () => {
	const app = setup()
	await handler(requestAccess)(app.ctx, {})
	await handler(requestAccess)(app.ctx, {})
	expect(app.rows.members).toHaveLength(1)
	expect(app.rows.members![0].status).toBe("pending")
	await expect(handler(list)(app.ctx, {})).rejects.toThrow("Only approvers")
	await expect(
		handler(decide)(app.ctx, { discordId: guestId, approve: true }),
	).rejects.toThrow("Only approvers")
	await expect(member(app.ctx)).rejects.toThrow()
})
test("approvals grant access, revocation removes it and preserves an audit trail", async () => {
	const app = setup()
	await handler(requestAccess)(app.ctx, {})
	app.as(adminId)
	await handler(decide)(app.ctx, { discordId: guestId, approve: true })
	expect(app.rows.members![0].approvedBy).toBe(adminId)
	app.as(guestId)
	expect((await member(app.ctx))._id).toBe(`user:${guestId}`)
	app.as(adminId)
	await handler(decide)(app.ctx, { discordId: guestId, approve: false })
	process.env.MEMBER_DISCORD_IDS = guestId
	app.as(guestId)
	await expect(member(app.ctx)).rejects.toThrow()
	await handler(requestAccess)(app.ctx, {})
	expect(app.rows.members![0].status).toBe("revoked")
	expect(app.rows.membershipEvents!.map((row) => row.action)).toEqual([
		"approved",
		"revoked",
	])
})
test("approvers cannot revoke other approvers and unauthenticated callers cannot request access", async () => {
	const app = setup()
	app.as(adminId)
	await expect(
		handler(decide)(app.ctx, { discordId: adminId, approve: false }),
	).rejects.toThrow("deployment settings")
	expect((await member(app.ctx))._id).toBe(`user:${adminId}`)
	app.as(null)
	await expect(handler(requestAccess)(app.ctx, {})).rejects.toThrow()
	expect(app.rows.members).toHaveLength(0)
})

test("direct membership decisions are idempotent and reject malformed IDs", async () => {
	const app = setup()
	app.as(adminId)
	await expect(
		handler(decide)(app.ctx, { discordId: "invalid", approve: true }),
	).rejects.toThrow("valid Discord")
	await handler(decide)(app.ctx, { discordId: guestId, approve: true })
	await handler(decide)(app.ctx, { discordId: guestId, approve: true })
	expect(app.rows.members).toHaveLength(1)
	expect(app.rows.membershipEvents).toHaveLength(1)
	const [row] = await handler(list)(app.ctx, {})
	expect(row.image).toBe("https://cdn.discordapp.com/avatars/example.png")
	expect(row.approvedBy).toBe(adminId)
	expect(typeof row.approvedAt).toBe("number")
})

test("an initial allowlisted member can be revoked without first requesting access", async () => {
	const app = setup()
	process.env.MEMBER_DISCORD_IDS = guestId
	expect((await member(app.ctx))._id).toBe(`user:${guestId}`)
	app.as(adminId)
	await handler(decide)(app.ctx, { discordId: guestId, approve: false })
	app.as(guestId)
	await expect(member(app.ctx)).rejects.toThrow()
})

test("approved members can delete products and ratings; guests and revoked users cannot", async () => {
	const app = setup()
	const productId = "products:1" as Id<"products">
	const records = new Map([
		[productId as string, { _id: productId }],
		["ratings:1", { _id: "ratings:1", productId }],
		["ratings:2", { _id: "ratings:2", productId }],
		["ratings:3", { _id: "ratings:3", productId: "products:2" }],
	])
	const query = app.ctx.db.query.bind(app.ctx.db)
	Object.assign(app.ctx.db, {
		query: (table: string) =>
			table === "ratings"
				? {
						withIndex: (
							_index: string,
							filter: (q: unknown) => unknown,
						) => {
							let target: unknown
							filter({
								eq: (_field: string, value: unknown) => {
									target = value
								},
							})
							return {
								collect: async () =>
									[...records.values()].filter(
										(row) =>
											"productId" in row &&
											row.productId === target,
									),
							}
						},
					}
				: query(table as "members"),
		get: async (id: string) => records.get(id) ?? null,
		delete: async (id: string) => {
			records.delete(id)
		},
	})
	await expect(handler(remove)(app.ctx, { productId })).rejects.toThrow(
		"MEMBERS_ONLY",
	)
	expect(records.size).toBe(4)
	app.as(adminId)
	await handler(decide)(app.ctx, { discordId: guestId, approve: true })
	app.as(guestId)
	await handler(remove)(app.ctx, { productId })
	expect([...records.keys()]).toEqual(["ratings:3"])
	await handler(remove)(app.ctx, { productId })
	expect([...records.keys()]).toEqual(["ratings:3"])
	app.as(adminId)
	await handler(decide)(app.ctx, { discordId: guestId, approve: false })
	app.as(guestId)
	await expect(handler(remove)(app.ctx, { productId })).rejects.toThrow(
		"MEMBERS_ONLY",
	)
	app.as(null)
	await expect(handler(remove)(app.ctx, { productId })).rejects.toThrow()
})
