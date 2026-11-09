import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex, crossDomain } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth/minimal'
import { components } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import authConfig from './auth.config'

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth({
  baseURL: process.env.CONVEX_SITE_URL,
  trustedOrigins: [process.env.SITE_URL!],
  database: authComponent.adapter(ctx),
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    },
  },
  plugins: [
    crossDomain({ siteUrl: process.env.SITE_URL! }),
    convex({ authConfig }),
  ],
})
