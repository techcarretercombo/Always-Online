# SJM Social Media

A full-stack social media platform inspired by Facebook, Instagram, Messenger, TikTok, and Marketplace — all in one place.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at /api)
- `pnpm --filter @workspace/sjm run dev` — run the SJM frontend (port 23136, served at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (artifacts/api-server, port 8080)
- Frontend: React + Vite + Wouter + Tailwind CSS + shadcn/ui (artifacts/sjm, port 23136)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB schema files (users, posts, stories, reels, messages, notifications, groups, marketplace, reports)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — generated React Query hooks and Zod schemas
- `artifacts/api-server/src/routes/` — all API route handlers
- `artifacts/sjm/src/pages/` — all frontend page components
- `artifacts/sjm/src/components/layout/AppLayout.tsx` — main sidebar layout

## Architecture decisions

- Auth uses base64url token encoding (`userId:randomHex:timestamp`), stored in localStorage as `sjm_token`. Custom fetch reads this automatically.
- Password hashing: SHA256 with static salt `sjm_salt_2024` (simple, suitable for dev).
- All API hooks use numeric IDs (`number`), not strings. Always parseInt before passing to hooks.
- DB `price` field in products returns as string from pg — routes cast with `parseFloat`.
- Admin routes require `isAdmin: true` on the user, enforced in admin.ts route.

## Product

SJM has these features:
- **Auth** — Register/login with email+password, beautiful split-screen landing page
- **Feed** — Stories row, post composer, posts with 6-reaction picker (like/love/haha/wow/sad/angry), infinite scroll
- **Reels** — Full-screen vertical TikTok-style video feed with auto-play, like/comment
- **Messages** — Messenger-style conversations list + real-time chat window
- **Profile** — Cover photo, avatar, bio, follow/unfollow, posts grid/list view
- **Groups** — Browse/create/join groups, private/public
- **Marketplace** — Product listing with categories, location, price, condition
- **Notifications** — Notification center with type icons, read/unread state
- **Search** — Global search across users, posts, groups, reels, products with tab filtering
- **Admin** — Platform stats dashboard, user management with ban, reports queue

## User preferences

- App should be 24/7 online with all features working 100%
- Bengali-speaking user; app language is English

## Gotchas

- Never use `console.log` in server code — use `req.log` in route handlers and `logger` for non-request code
- Do NOT run `pnpm dev` at workspace root
- Verify artifacts with `pnpm --filter @workspace/sjm run typecheck`, not `build`
- The `useListMessages`, `useGetUser`, `useGlobalSearch` hooks require `queryKey` when passing `enabled`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
