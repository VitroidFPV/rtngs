import { ConvexError } from "convex/values"
import type { QueryCtx, MutationCtx } from "../_generated/server"
import { authComponent } from "../auth"
import { components } from "../_generated/api"
import { isMember } from "./membership"

export async function account(ctx: QueryCtx | MutationCtx) {
	const user = await authComponent.getAuthUser(ctx)
	if (!user) throw new ConvexError("Sign in with Discord first.")
	const linked = await ctx.runQuery(components.betterAuth.adapter.findOne, {
		model: "account",
		where: [
			{ field: "userId", operator: "eq", value: user._id },
			{ field: "providerId", operator: "eq", value: "discord" },
		],
	})
	if (!linked) throw new ConvexError("Sign in with Discord first.")
	return { user, discordId: linked.accountId }
}
export async function access(ctx: QueryCtx | MutationCtx) {
	const identity = await account(ctx)
	const record = await ctx.db
		.query("members")
		.withIndex("by_discord", (q) => q.eq("discordId", identity.discordId))
		.unique()
	return {
		...identity,
		record,
		...permissions(
			identity.discordId,
			record?.status,
			process.env.ADMIN_DISCORD_IDS,
			process.env.MEMBER_DISCORD_IDS,
		),
	}
}
export function permissions(
	discordId: string,
	status: "pending" | "approved" | "revoked" | undefined,
	admins?: string,
	seeds?: string,
) {
	const admin = isMember(discordId, admins)
	return {
		admin,
		member:
			admin ||
			(status ? status === "approved" : isMember(discordId, seeds)),
	}
}
export async function member(ctx: QueryCtx | MutationCtx) {
	const result = await access(ctx)
	if (!result.member) throw new ConvexError({ code: "MEMBERS_ONLY" })
	return result.user
}
export async function admin(ctx: QueryCtx | MutationCtx) {
	const result = await access(ctx)
	if (!result.admin)
		throw new ConvexError("Only approvers can manage membership.")
	return result
}
