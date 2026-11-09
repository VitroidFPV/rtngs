# rtngs

Product ratings for members, built with Nuxt 4, Nuxt UI, Convex, and Better Auth with Discord sign-in.

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

## Production (Netlify)

Development and production use separate Convex deployments and databases:

| | Development | Production |
| --- | --- | --- |
| Frontend | `http://localhost:3000` | `https://rtngs.vitroidfpv.com` |
| Convex deployment | `kindly-stork-422` | `abundant-civet-657` |
| Frontend configuration | `.env.local` | Netlify environment variables |

Keep `.env.local` pointed at development. Run `bun run convex:dev` to deploy
development backend changes, and `bun run dev` for the local frontend.

`netlify.toml` deploys the production backend before publishing the frontend.
The production command is:

```sh
bunx convex deploy --cmd "bunx nuxt build" --cmd-url-env-var-name CONVEX_URL
```

Convex supplies both production URLs to the build. This invokes Nuxt directly
so the local build script's `.env.local` is not loaded. Netlify also stores the
production `CONVEX_URL` and `CONVEX_SITE_URL`; remove any stale
`NUXT_PUBLIC_CONVEX_URL` / `NUXT_PUBLIC_CONVEX_SITE_URL` overrides. The
`CONVEX_DEPLOY_KEY` is a credential set only for the production deploy context. Do not set
`CONVEX_DEPLOYMENT` in Netlify. Deploy previews are not configured with their
own backend or auth origin.

Set these on the **production Convex deployment**, separately from development:

- `SITE_URL=https://rtngs.vitroidfpv.com` (no trailing slash)
- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` from the same Discord app
- A separate `BETTER_AUTH_SECRET`
- `ADMIN_DISCORD_IDS` for production approvers

Use `bunx convex env ... --prod` to manage production variables; without
`--prod`, the CLI manages development. Development's `SITE_URL` is
`http://localhost:3000`. CORS origins must match exactly, without trailing slashes.

Keep both redirect URLs in the Discord application's OAuth2 settings:

```text
https://kindly-stork-422.eu-west-1.convex.site/api/auth/callback/discord
https://abundant-civet-657.eu-west-1.convex.site/api/auth/callback/discord
```

Production starts with its own empty database. Development products, ratings,
sessions, and membership approvals are not copied. Configured approvers can
sign in and approve production members.

## Checks

```sh
bun test
bun run typecheck
bun run build
```

Discord sign-in allows any Discord account, but product access requires membership. Discord accounts without an email may need Better Auth's [provider profile fallback](https://better-auth.com/docs/authentication/discord).

Auth setup follows [Convex + Better Auth](https://labs.convex.dev/better-auth/framework-guides/react), adapted to Better Auth's Vue client and Convex's framework-independent browser client. No React UI or extra database is used.

## Product library

Products have a name, optional brand, description and http(s) link, and up to 10
lowercase tags. Members can add products; only their creator can edit them.
Each member has one editable 1-5 rating and optional review per product. Ratings
can be removed. Library changes arrive through Convex subscriptions.

Set `ADMIN_DISCORD_IDS` in the Convex deployment environment to a comma-separated
list of trusted approvers' Discord user IDs. Approvers automatically have product
access and can use **Manage members** to approve requests, add members by ID, or
revoke access. The app cannot grant approver privileges.

Other users sign in and select **Request access**. Requests stay pending until an
approver approves or declines them. Revoked users must contact an approver;
requesting again cannot restore access. Membership updates are reactive.
Approvals store the approver ID and timestamp. Every approval/revocation is also
recorded in `membershipEvents`.

`MEMBER_DISCORD_IDS` remains an optional initial member allowlist for existing
users. An explicit database status overrides it, so these members can be revoked
by ID too. Both settings are server-side. Without an approver, approved database
membership, or an initial allowlist entry, access is denied. Membership checks use
the authenticated Discord account ID, not an ID supplied by the browser or the
internal Better Auth user ID. Email verification is not required.

To copy an ID in Discord, enable Developer Mode under Settings > Advanced,
then right-click a user and choose Copy User ID. Existing Discord accounts and redirect
handling are unchanged.

Deploy development schema/functions with `bun run convex:dev`. Netlify deploys
production schema/functions as part of the production build.
