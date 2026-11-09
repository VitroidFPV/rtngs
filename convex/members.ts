import { ConvexError, v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { access, admin } from './lib/access'
import { isMember } from './lib/membership'
import { components } from './_generated/api'
import { authComponent } from './auth'

export const status = query({ args: {}, handler: async ctx => {
  const result = await access(ctx)
  return { discordId: result.discordId, admin: result.admin, member: result.member, status: result.record?.status ?? null }
} })
export const requestAccess = mutation({ args: {}, handler: async ctx => {
  const result = await access(ctx)
  if (result.member || result.record) return
  await ctx.db.insert('members', { discordId: result.discordId, name: result.user.name, status: 'pending' })
} })
export const list = query({ args: {}, handler: async ctx => {
  await admin(ctx)
  const records = await ctx.db.query('members').order('desc').collect()
  return Promise.all(records.map(async record => {
    const linked = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'account', where: [
        { field: 'accountId', operator: 'eq', value: record.discordId },
        { field: 'providerId', operator: 'eq', value: 'discord' },
      ],
    })
    const profile = linked ? await authComponent.getAnyUserById(ctx, linked.userId) : null
    return { ...record, name: profile?.name ?? record.name, image: profile?.image ?? undefined,
      isAdmin: isMember(record.discordId, process.env.ADMIN_DISCORD_IDS) }
  }))
} })
export const decide = mutation({ args: { discordId: v.string(), approve: v.boolean() }, handler: async (ctx, args) => {
  const actor = await admin(ctx)
  if (isMember(args.discordId, process.env.ADMIN_DISCORD_IDS)) throw new ConvexError('Approvers are managed in deployment settings.')
  if (!/^\d{17,20}$/.test(args.discordId)) throw new ConvexError('Enter a valid Discord user ID.')
  const record = await ctx.db.query('members').withIndex('by_discord', q => q.eq('discordId', args.discordId)).unique()
  const status = args.approve ? 'approved' as const : 'revoked' as const
  if (record?.status === status) return
  const at = Date.now()
  const approval = args.approve ? { approvedBy: actor.discordId, approvedAt: at } : {}
  if (record) await ctx.db.patch(record._id, { status, ...approval })
  else await ctx.db.insert('members', { discordId: args.discordId, name: args.discordId, status, ...approval })
  await ctx.db.insert('membershipEvents', { discordId: args.discordId, actorId: actor.discordId, action: status, at })
} })
