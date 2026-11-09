# rtngs

Product ratings for friends, built with Nuxt 4, Nuxt UI, Convex, and Better Auth with Discord sign-in. Product and rating features are not implemented yet.

Authentication runs in Convex. The browser uses Better Auth’s Vue client and Convex’s browser client; the sign-in UI is client-only.

## Run locally

Use Bun 1.4.2 (see `packageManager` in `package.json`).

```sh
bun install --frozen-lockfile
bun run convex:dev
```

The Convex CLI configures a development deployment and writes `CONVEX_URL` and `CONVEX_SITE_URL` to `.env.local`. Nuxt uses those values directly. Keep the exact URLs, including any region such as `.eu-west-1`. Remove stale `NUXT_PUBLIC_CONVEX_URL` / `NUXT_PUBLIC_CONVEX_SITE_URL` overrides when switching deployments. Restart Nuxt after changing `.env.local`.

For a cloud deployment, the backend stays available without a local Convex process; `convex dev` watches and deploys code changes. For a local deployment, keep it running to serve ports 3210 and 3211.

Create an application in the [Discord Developer Portal](https://discord.com/developers/applications). Under OAuth2, add your deployment's `CONVEX_SITE_URL` followed by `/api/auth/callback/discord`. For the current cloud development deployment:

```text
https://kindly-stork-422.eu-west-1.convex.site/api/auth/callback/discord
```

Set these **on the Convex development deployment**, not in Nuxt's public runtime config:

```sh
bunx convex env set SITE_URL http://localhost:3000
bunx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
bunx convex env set DISCORD_CLIENT_ID YOUR_CLIENT_ID
bunx convex env set DISCORD_CLIENT_SECRET
```

The last command prompts for the secret. Never commit credentials. Then run:

```sh
bun run dev
```

Use `http://localhost:3000` consistently: it must match `SITE_URL`.

## Checks

```sh
bun test
bun run typecheck
bun run build
```

Discord sign-in currently allows any Discord account. Add an invite/allowlist check in Convex before sharing the app. Discord accounts without an email may need Better Auth's [provider profile fallback](https://better-auth.com/docs/authentication/discord).

Auth setup follows [Convex + Better Auth](https://labs.convex.dev/better-auth/framework-guides/react), adapted to Better Auth's Vue client and Convex's framework-independent browser client. No React UI or extra database is used.
