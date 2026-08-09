# Design: Timmy Tracker base framework

Status: proposed
Related feature: [Base Framework](features.md) in `docs/features.md`

## Context

This document proposes the initial architecture for the Timmy Tracker
website, covering the framework, data storage, authentication, and mapping
approach needed before any MVP features (submitting a pebble, admin
verification, etc.) can be built on top.

This is a small, low-traffic site for a family and friends to track where
Tim's memorial stones have been placed — 150 pebbles were physically
made, a fixed ceiling rather than a growth projection (see the root
`README.md`'s "Assumptions" section). The design favours the simplest
stack that gets a real map + database in front of users, over anything
that anticipates scale this project will never see.

## Decisions

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router, TypeScript) | Single deployable app covering both UI and backend (API routes / server actions) — no separate service to build, version, or deploy in sync. Matches the direction already noted in `docs/features.md`. |
| Hosting | Vercel | Free tier comfortably covers this traffic level; first-party Next.js support; GitHub-integrated deploys give us most of "CICD" for free. |
| Database | Postgres (Vercel Postgres / Neon) via Prisma | Relational shape fits pebbles + submission status cleanly; Prisma gives typed queries and migrations without hand-written SQL; Vercel's native Postgres integration avoids a third account. |
| Auth | Auth.js (NextAuth) with Google OAuth | Satisfies the "behind SSO" requirement without us storing or managing passwords. Family/friends likely already have Google accounts. Grew from "admin-only" into whole-app access control — see [docs/design-access-control.md](design-access-control.md) for the full design (whitelist table, request-access flow). |
| Maps | Google Maps JavaScript API via `@vis.gl/react-google-maps` | Google's own maintained React wrapper; matches the project's stated Google Maps integration. Pebble markers use `AdvancedMarkerElement` (via the library's `AdvancedMarker` component), not the deprecated `google.maps.Marker` — [Google's deprecation notice](https://developers.google.com/maps/deprecations), Feb 2024. `AdvancedMarkerElement` only renders on a map with a Map ID, so `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` is required alongside the API key for the map to render; both fall back to the same placeholder when either is unset. |
| Place lookup | Geocoding API, called client-side via `useMapsLibrary("geocoding")` | Reuses the same `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and referrer restriction as the map — no second credential or server-side key needed. Lets submitters type a place name instead of knowing exact coordinates; falls back to manual lat/long entry if the API key/lookup isn't available. |
| Styling | Tailwind CSS | Keeps styling co-located with markup, no separate CSS architecture to design for a site this size. |
| Testing | Vitest + React Testing Library (unit/component), Playwright (E2E) | Fast, ESM-native, standard pairing for Next.js App Router components. Playwright's E2E suite is split three ways: `playwright.config.ts` (CI-safe, every feature flag forced off, no external services), `playwright.map.config.ts` (local-only — real Google Maps integration against your own API key, kept out of CI to avoid a paid external service in the merge gate), and `playwright.admin.config.ts` (local-only — real local Postgres and a mocked NextAuth session, kept out of CI's zero-dependency e2e job rather than adding a database service there; see `docs/design-admin-pebbles.md`). |
| CI | GitHub Actions (lint, shellcheck, actionlint, test, build, gitleaks secrets scan on every push/PR) | Gives us a merge gate immediately. Automated *deployment* is intentionally out of scope here — see [Deferred](#deferred). |

## Data model

A single `Pebble` entity is enough for the MVP feature set described in
`docs/features.md`:

```prisma
model Pebble {
  id           String   @id @default(cuid())
  latitude     Float
  longitude    Float
  depositedBy  String
  depositedAt  DateTime
  status       PebbleStatus @default(PENDING)
  createdAt    DateTime @default(now())
  verifiedAt   DateTime?
}

enum PebbleStatus {
  PENDING
  VERIFIED
}
```

`status` exists so the "submit a pebble" flow (public) and the "accept /
verify submitted pebble" flow (admin) can share one table: a submission
is just a `Pebble` row created with `status = PENDING`.

`docs/design-access-control.md` adds one more field, `submitterEmail`
(immutable, captured from the session), alongside the existing
editable `depositedBy` — see that doc for why.

## Feature flags

`docs/features.md` intentionally lists work that lands incrementally, and
CLAUDE.md requires every new feature to ship dark until promoted. For a
project this size a small config-driven flag module is enough — no need
for a third-party flag service:

```ts
// src/lib/feature-flags.ts
export const featureFlags = {
  map: process.env.NEXT_PUBLIC_FEATURE_MAP === "true",
  submitPebble: process.env.NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE === "true",
  admin: process.env.FEATURE_ADMIN === "true",
} as const;
```

Flags default to `false` (off) everywhere, including on Vercel, until a
feature is explicitly promoted via environment variable. This keeps the
deployed site backwards-compatible while a feature is mid-flight, per
CLAUDE.md's workflow.

## Amendment (2026-08-10): Dynamic feature flags

**Status: implemented.** `map`, `submitPebble`, and `pebblePhotos` moved
off `NEXT_PUBLIC_*` env vars onto DB-backed `AppSetting` rows, admin-
toggleable at runtime from `/admin` → Settings, no redeploy required.
Prompted directly by live-testing friction: the orphaned-photo cleanup
delay (`docs/design-pebble-photos.md`'s amendment) started as a
hardcoded constant, and every time it needed adjusting during testing
it meant a code change + redeploy — the same problem these three
flags already had every time one needed flipping.

| Concern | Choice | Why |
|---|---|---|
| Scope | Only the three `NEXT_PUBLIC_*` flags | These are the ones actually exposed to end users — `NEXT_PUBLIC_*` env vars get inlined into the shipped JS bundle at build time, readable by anyone who inspects it. `admin` and `authGate` stay env vars: both are already server-only (nothing to "hide" by moving them), and `authGate` specifically *can't* move — it's read synchronously in `proxy.ts`, which runs on Vercel's Edge runtime and has no Prisma/Postgres access at all (the same constraint `docs/design-access-control.md` already split the auth gate around). |
| Storage | New generic `AppSetting` table (`key`/`value`/`updatedAt`), not three dedicated columns | The orphaned-photo delay (`ORPHANED_IMAGE_DELAY_MINS`) is the same shape of problem — an admin-adjustable scalar — so one small reusable table serves both instead of a bespoke column per setting. `src/lib/app-settings.ts` holds the plain `getSetting`/`setSetting` primitives; typed wrappers live next to the feature that uses them (`src/lib/dynamic-feature-flags.ts` for the three flags, `src/lib/pebble-photo-orphans.ts` for the delay). |
| Missing row behavior | Fails closed — off for flags, `0` (show everything) for the orphan delay | No env var to fall back to anymore, and no hardcoded default duplicated in code either (a lesson from the delay itself briefly regressing to unusable — see `docs/design-pebble-photos.md`). A fresh, unseeded database just starts with every dynamic flag off, same as the old env-var default. |
| Seed values | `prisma/seed.ts` seeds all three flags `"true"` (not the usual off-by-default) | These aren't new/unreleased features being seeded for the first time — they're already-live, already-promoted features being migrated to a new storage mechanism. Seeding them off would silently regress the live site the moment this migration deploys, until someone remembered to flip them back on. `createMany` with `skipDuplicates`, so re-running seed later never clobbers a value already changed from the Settings tab. |
| Server access | `getDynamicFeatureFlags()` — Server Components/Actions/Route Handlers call this directly (a plain async Prisma-backed read), never via HTTP | Self-fetching your own API route from server-side code is wasteful indirection; every server-side call site already just needed the same async function `/api/config` itself calls. |
| Client access | React Context (`FeatureFlagsProvider`/`useFeatureFlags()`), seeded with a value the nearest Server Component page already fetched — not a client-side `fetch()` on mount | First cut of this used a client-side fetch-on-mount provider; that has a real cost — flag-gated UI (the map, photo upload fields) renders in its "off" state for one round trip before flipping on, a regression from the old build-time-static rendering. Passing the already-fetched value down through Context instead makes it correct on first paint, with zero extra network round trips, and avoids threading a prop through every intermediate component that doesn't itself care about the value (prop drilling) — each of `src/app/page.tsx`, `submit/page.tsx`, and `admin/page.tsx` wraps its own subtree with its own fetch, so `Map`/`SubmitPebbleForm`/`AdminAddPebbleForm` can read flags via the hook regardless of how deep they're nested. Where a Server Component parent already has the flag value and its child is *also* a Server Component (`AdminPebbles`, receiving `pebblePhotosEnabled` from `admin/page.tsx`), it's just a plain prop — Context is only reached for once a "use client" boundary is actually crossed. |
| `GET /api/config` | Kept as a real, separately-fetchable endpoint even though no current React code calls it client-side | Still the right general-purpose mechanism for anything that isn't a Next.js Server Component (a future non-React consumer, manual `curl` debugging in production). Necessarily public/unauthenticated — an anonymous visitor landing on `/` needs to know whether the map is on before they've signed in, so it can't sit behind the same gate it helps decide whether to show. This means moving these flags off `NEXT_PUBLIC_*` gets you *admin control without a redeploy*, not *secrecy* — the values were never secret (they're what used to be inlined into public JS anyway), and this endpoint still returns them to anyone who asks. |
| Admin UI | New unconditional `AdminTabs` entry, "Settings" (`ManageFeatureFlags` + `ManageOrphanDelay`, same toggle-button pattern as `toggleAllowedUserAdminAction`) | Unconditional, unlike the other tabs, because it's where the flags controlling every other tab's content get toggled — it can't itself be hidden behind one of them. |

New modules: `src/lib/app-settings.ts`, `src/lib/dynamic-feature-flags.ts`.
New route: `src/app/api/config/route.ts`. New components:
`src/components/FeatureFlagsProvider.tsx`, `ManageFeatureFlags.tsx`,
`ManageOrphanDelay.tsx`. New action: `updateFeatureFlagAction` in
`src/app/admin/actions.ts`.

## Project layout

```
src/
  app/                # Next.js App Router pages
    layout.tsx        # Wraps children in AuthGate
    page.tsx          # Home: intro + map
    admin/            # Manage-users + manage-pebbles UI + actions, gated by requireAdmin()
  components/
    Map.tsx            # Google Maps embed, gated by featureFlags.map
    AuthGate.tsx        # Whitelist check + RequestAccess/AppHeader (docs/design-access-control.md)
    PlaceLookup.tsx      # Geocoding lookup, shared by SubmitPebbleForm and AdminAddPebbleForm
  lib/
    feature-flags.ts
    prisma.ts          # Prisma client singleton
    auth-guards.ts      # requireAllowedUser()/requireAdmin(), used by every mutating action
    pebbles.ts           # Pebble data layer, including admin add/verify/move (docs/design-admin-pebbles.md)
  proxy.ts             # Edge auth check (formerly middleware.ts, renamed in Next.js 16)
  auth.ts              # Auth.js (NextAuth) config
prisma/
  schema.prisma
e2e/
  home.spec.ts               # CI-safe Playwright test (playwright.config.ts)
  map.spec.ts                # Local-only, real Maps key (playwright.map.config.ts)
  submit-place-lookup.spec.ts # Local-only, real Geocoding API (playwright.map.config.ts)
  admin-pebbles.spec.ts       # Local-only, real Postgres + mocked session (playwright.admin.config.ts)
scripts/
  setup.sh             # One-time local environment bootstrap
  dev.sh               # Starts local Postgres (if present) + the dev server
  db.sh                # start|stop|status for local Postgres
  _nvm.sh              # Shared nvm loader, sourced by the scripts above
.github/workflows/
  ci.yml               # Lint + test on every PR
output/configs/
  .env.smoke           # Non-secret config for local smoke testing
```

## Deferred (tracked separately in `docs/features.md`)

The following are explicitly **not** part of this scaffolding change, to
keep this PR reviewable. Each remains its own entry in
`docs/features.md`:

* **Automated deployment** — this change adds CI (lint + test) but not
  auto-deploy-on-merge. That's the remainder of the "CICD pipeline"
  feature.
* **MVP feature behaviour** — the intro copy, live pebble data, submit
  form, and admin verification UI are separate feature entries and will
  each get their own design/tests/flag behind this base framework.
* **Image/photo attachments for pebbles** — not requested in
  `docs/features.md`; noted here only so a future session doesn't assume
  it was considered and rejected.

## Open questions for a future pass

* Rate limiting / spam protection on the public "submit a pebble" form —
  needed before that feature is promoted, not before.
* Whether pebble locations need approximate/fuzzed coordinates for
  privacy (e.g. family home addresses) before public verification is
  live.
