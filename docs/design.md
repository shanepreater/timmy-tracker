# Design: Timmy Tracker base framework

Status: proposed
Related feature: [Base Framework](features.md) in `docs/features.md`

## Context

This document proposes the initial architecture for the Timmy Tracker
website, covering the framework, data storage, authentication, and mapping
approach needed before any MVP features (submitting a pebble, admin
verification, etc.) can be built on top.

This is a small, low-traffic site for a family and friends to track where
Tim's memorial stones have been placed. The design favours the simplest
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
| Testing | Vitest + React Testing Library (unit/component), Playwright (E2E) | Fast, ESM-native, standard pairing for Next.js App Router components. Playwright's E2E suite is split in two: `playwright.config.ts` (CI-safe, every feature flag forced off, no external services) and `playwright.map.config.ts` (local-only — exercises the real Google Maps integration against your own API key, deliberately kept out of CI to avoid depending on a paid external service in the merge gate). |
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

## Project layout

```
src/
  app/                # Next.js App Router pages
    layout.tsx        # Wraps children in AuthGate
    page.tsx          # Home: intro + map
    admin/            # Manage-users UI + actions, gated by requireAdmin()
  components/
    Map.tsx            # Google Maps embed, gated by featureFlags.map
    AuthGate.tsx        # Whitelist check + RequestAccess/AppHeader (docs/design-access-control.md)
  lib/
    feature-flags.ts
    prisma.ts          # Prisma client singleton
    auth-guards.ts      # requireAllowedUser()/requireAdmin(), used by every mutating action
  proxy.ts             # Edge auth check (formerly middleware.ts, renamed in Next.js 16)
  auth.ts              # Auth.js (NextAuth) config
prisma/
  schema.prisma
e2e/
  home.spec.ts               # CI-safe Playwright test (playwright.config.ts)
  map.spec.ts                # Local-only, real Maps key (playwright.map.config.ts)
  submit-place-lookup.spec.ts # Local-only, real Geocoding API (playwright.map.config.ts)
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
