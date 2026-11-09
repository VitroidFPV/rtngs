import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  members: defineTable({ discordId: v.string(), name: v.string(), status: v.union(v.literal('pending'), v.literal('approved'), v.literal('revoked')),
    approvedBy: v.optional(v.string()), approvedAt: v.optional(v.number()) }).index('by_discord', ['discordId']),
  membershipEvents: defineTable({ discordId: v.string(), actorId: v.string(), action: v.union(v.literal('approved'), v.literal('revoked')), at: v.number() }),
  products: defineTable({ name: v.string(), brand: v.string(), description: v.string(), url: v.string(), tags: v.array(v.string()), createdBy: v.string() }),
  ratings: defineTable({ productId: v.id('products'), userId: v.string(), name: v.string(), score: v.number(), note: v.string() })
    .index('by_product', ['productId']).index('by_user_product', ['userId', 'productId']),
})
