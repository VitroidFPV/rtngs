# rtngs

A members-only product rating library built with Nuxt, Nuxt UI, Convex, and Better Auth. Sign in with Discord to request access; members can add or delete products and leave editable 1–5 ratings and reviews.

## Development

Requires Bun 1.4.2, a Convex deployment, and a [Discord application](https://discord.com/developers/applications).

```sh
bun install --frozen-lockfile
bun run convex:dev
```

Convex configures the development deployment and writes its URLs to `.env.local`. Keep the exact URLs, including the region, and remove stale `NUXT_PUBLIC_CONVEX_*` overrides.

Add `<CONVEX_SITE_URL>/api/auth/callback/discord` as an OAuth2 redirect in Discord, then set the backend environment:

```sh
bunx convex env set SITE_URL http://localhost:3000
bunx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
bunx convex env set DISCORD_CLIENT_ID YOUR_CLIENT_ID
bunx convex env set DISCORD_CLIENT_SECRET
bunx convex env set ADMIN_DISCORD_IDS YOUR_DISCORD_USER_ID
```

The client secret command prompts for its value. Keep credentials out of source control.

In another terminal, start the frontend:

```sh
bun run dev
```

Open `http://localhost:3000` to match `SITE_URL`. Restart Nuxt after changing `.env.local`. Keep `convex:dev` running to sync backend changes; local Convex deployments also need it to serve requests.

## Product image search

The product form can search images using the brand and product name. Select a result to fill the image URL, then save the product. You can also paste a direct image link.

Search uses the same DuckDuckGo token and image-results flow as the vitroidfpv.com build-guide editor. No API key is required. Search runs in a Nuxt server route on Netlify, which verifies membership through Convex using the signed-in user’s token. Only members can search. DuckDuckGo can temporarily block automated requests; failures are shown in the form so you can retry or paste an image URL manually. Images remain hosted by their original sites.

## Membership

`ADMIN_DISCORD_IDS` is a comma-separated list of approvers. They have access automatically and can approve requests, add members by Discord ID, or revoke access through **Manage members** at `/members`. Enable Discord's Developer Mode to copy user IDs.

Other users select **Request access** after signing in. Revoked users must contact an approver. Optional `MEMBER_DISCORD_IDS` seeds initial access; database membership status takes precedence. Both settings belong in Convex.

## Production

[rtngs.vitroidfpv.com](https://rtngs.vitroidfpv.com) runs on Netlify with a separate Convex production database. Keep `.env.local` pointed at development.

- Netlify's production build deploys Convex before building Nuxt (see `netlify.toml`). Set `CONVEX_DEPLOY_KEY` only in the production context, plus production `CONVEX_URL` and `CONVEX_SITE_URL`. Do not set `CONVEX_DEPLOYMENT` or stale `NUXT_PUBLIC_CONVEX_*` overrides.
- Set production Convex variables with `bunx convex env set <NAME> <VALUE> --prod`: `SITE_URL=https://rtngs.vitroidfpv.com`, Discord credentials, a separate `BETTER_AUTH_SECRET`, and `ADMIN_DISCORD_IDS`.
- Add the production `<CONVEX_SITE_URL>/api/auth/callback/discord` redirect to Discord alongside development's. `SITE_URL` must match the frontend origin exactly, without a trailing slash.
- Production data and membership approvals are separate from development. Deploy previews have no dedicated backend or auth origin.

## Localization

Nuxt i18n provides English (default), Czech, and Slovak. The header language selector saves the choice in a cookie; first visits use the browser language when supported. URLs stay unchanged. Translation files live in `i18n/locales/`, with Czech and Slovak plural rules in `i18n/i18n.config.ts`.

## Checks

```sh
bun test
bun run lint
bun run format:check
bun run typecheck
bun run build
```

Use `bun run lint:fix` to apply ESLint fixes and `bun run format` to format files with Prettier.
