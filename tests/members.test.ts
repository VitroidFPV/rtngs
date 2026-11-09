import { afterEach, beforeEach, expect, test } from 'bun:test'
import { requestAccess, decide, list } from '../convex/members'
import { member } from '../convex/lib/access'
import type { MutationCtx } from '../convex/_generated/server'

const adminId = '111111111111111111'
const guestId = '222222222222222222'
const originalAdmins = process.env.ADMIN_DISCORD_IDS
const originalMembers = process.env.MEMBER_DISCORD_IDS
beforeEach(() => { process.env.ADMIN_DISCORD_IDS = adminId; process.env.MEMBER_DISCORD_IDS = '' })
afterEach(() => {
  if (originalAdmins === undefined) delete process.env.ADMIN_DISCORD_IDS
  else process.env.ADMIN_DISCORD_IDS = originalAdmins
  if (originalMembers === undefined) delete process.env.MEMBER_DISCORD_IDS
  else process.env.MEMBER_DISCORD_IDS = originalMembers
})

// Exercise real handlers and auth checks with an in-memory Convex context.
function setup() {
  const rows: Record<string, any[]> = { members: [], membershipEvents: [] }
  let actor: string | null = guestId
  const ctx = {
    auth: { getUserIdentity: async () => actor ? { subject: `user:${actor}`, sessionId: 'session' } : null },
    runQuery: async (_ref: unknown, args: any) => {
      if (args.model === 'session') return { expiresAt: Date.now() + 60000 }
      if (args.model === 'user') return { _id: `user:${actor}`, name: 'Member', image: 'https://cdn.discordapp.com/avatars/example.png' }
      if (args.model === 'account') {
        const lookup = args.where.find((condition: any) => condition.field === 'accountId')
        if (lookup) return { accountId: lookup.value, userId: `user:${lookup.value}` }
        expect(args.where).toContainEqual({ field: 'userId', operator: 'eq', value: `user:${actor}` })
        expect(args.where).toContainEqual({ field: 'providerId', operator: 'eq', value: 'discord' })
        return { accountId: actor }
      }
    },
    db: {
      query: (table: string) => ({
        withIndex: (_name: string, select: any) => {
          let id: string
          select({ eq: (_field: string, value: string) => { id = value } })
          return { unique: async () => rows[table]!.find(row => row.discordId === id) ?? null }
        },
        order: () => ({ collect: async () => rows[table] }),
      }),
      insert: async (table: string, row: any) => { const id = `${table}:${rows[table]!.length}`; rows[table]!.push({ ...row, _id: id }); return id },
      patch: async (id: string, patch: any) => { Object.assign(rows.members!.find(row => row._id === id), patch) },
    },
  } as unknown as MutationCtx
  return { ctx, rows, as: (id: string | null) => { actor = id } }
}
const handler = <T extends { _handler?: unknown }>(fn: T) => fn._handler as (ctx: MutationCtx, args: any) => Promise<any>

test('requests are idempotent and guests cannot list or approve members', async () => {
  const app = setup()
  await handler(requestAccess)(app.ctx, {})
  await handler(requestAccess)(app.ctx, {})
  expect(app.rows.members).toHaveLength(1)
  expect(app.rows.members![0].status).toBe('pending')
  await expect(handler(list)(app.ctx, {})).rejects.toThrow('Only approvers')
  await expect(handler(decide)(app.ctx, { discordId: guestId, approve: true })).rejects.toThrow('Only approvers')
  await expect(member(app.ctx)).rejects.toThrow()
})
test('approvals grant access, revocation removes it and preserves an audit trail', async () => {
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
  expect(app.rows.members![0].status).toBe('revoked')
  expect(app.rows.membershipEvents!.map(row => row.action)).toEqual(['approved', 'revoked'])
})
test('approvers cannot revoke other approvers and unauthenticated callers cannot request access', async () => {
  const app = setup()
  app.as(adminId)
  await expect(handler(decide)(app.ctx, { discordId: adminId, approve: false })).rejects.toThrow('deployment settings')
  expect((await member(app.ctx))._id).toBe(`user:${adminId}`)
  app.as(null)
  await expect(handler(requestAccess)(app.ctx, {})).rejects.toThrow()
  expect(app.rows.members).toHaveLength(0)
})

test('direct membership decisions are idempotent and reject malformed IDs', async () => {
  const app = setup()
  app.as(adminId)
  await expect(handler(decide)(app.ctx, { discordId: 'invalid', approve: true })).rejects.toThrow('valid Discord')
  await handler(decide)(app.ctx, { discordId: guestId, approve: true })
  await handler(decide)(app.ctx, { discordId: guestId, approve: true })
  expect(app.rows.members).toHaveLength(1)
  expect(app.rows.membershipEvents).toHaveLength(1)
  const [row] = await handler(list)(app.ctx, {})
  expect(row.image).toBe('https://cdn.discordapp.com/avatars/example.png')
  expect(row.approvedBy).toBe(adminId)
  expect(typeof row.approvedAt).toBe('number')
})

test('an initial allowlisted member can be revoked without first requesting access', async () => {
  const app = setup()
  process.env.MEMBER_DISCORD_IDS = guestId
  expect((await member(app.ctx))._id).toBe(`user:${guestId}`)
  app.as(adminId)
  await handler(decide)(app.ctx, { discordId: guestId, approve: false })
  app.as(guestId)
  await expect(member(app.ctx)).rejects.toThrow()
})
