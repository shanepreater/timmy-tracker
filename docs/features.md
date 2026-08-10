# Required system features

This is the active backlog of outstanding work. Historical detail for
completed items should be read from git history.

## Features work process

1. Pick a feature and confirm its design brief.
2. Implement behind a feature switch (default off) unless the feature is an
   operational concern (for example CI/CD workflow-only changes).
3. Add or adjust tests to prove acceptance criteria.
4. Mark the feature complete in this document, then remove old completed
   entries when they are no longer useful as immediate context.

## Source design documents

* [docs/design.md](design.md) - base framework, data model, maps, testing,
  and feature-flag approach.
* [docs/design-access-control.md](design-access-control.md) - app-wide auth
  gate, whitelist model, and access request workflow.
* [docs/design-admin-pebbles.md](design-admin-pebbles.md) - admin pebble
  add/verify/move workflows.
* [docs/design-ui-redesign.md](design-ui-redesign.md) - design tokens,
  shared primitives, and the Tim-photo header/favicon treatment.

## Backlog

### Proposed delivery order

Recommended sequence for finishing remaining work with minimum rework and
fastest path to stable production:

0. ~~"Delete a pebble (admin)", "Orphaned photo-upload cleanup
  (admin)", and "Dynamic feature flags"~~ — done (2026-08-10). All
  three surfaced by the first real testers on the production
  deployment (2026-08-09) and jumped the queue ahead of everything
  below.
1. Close out "Associate a photo with a location" (run real Blob e2e +
  manual smoke and mark complete).
2. Complete "Base framework completion" (production env/runtime parity,
  deployed map wiring, migration/deploy confidence).
3. Complete "CI/CD pipeline and deployment" (deploy-on-merge + rollback
  runbook).
4. Deliver "Fly-by mode" (high user value, no new provider coupling).
5. Deliver "What3words support" (new provider integration and ops surface).
6. Deliver "Multiple photos per pebble" (net-new scope expansion on an
  already-shipped feature — lowest priority of the live-testing asks
  since a single photo already works).

This order intentionally prioritizes operational reliability and
production confidence before adding net-new user features.

### [ ] CI/CD pipeline and deployment
Design brief:
Harden and complete delivery automation using the existing GitHub Actions
workflow as the quality gate, then add deploy-on-merge to production.

Current state:
`.github/workflows/ci.yml` already runs ESLint, shellcheck
(`scripts/*.sh`), actionlint, Vitest, production build, and gitleaks on
push/PR.

Acceptance criteria:
* Pull requests to `main` are blocked unless all CI checks pass.
* Merge to `main` triggers exactly one production deploy workflow/job.
* Deploy job uses repository/environment secrets (no inline credentials).
* Deploy failure is visible in GitHub checks and does not report success.
* README or docs include the deploy pipeline flow and rollback approach.

### [ ] Base framework completion
Design brief:
Close the remaining gaps in the base architecture from `docs/design.md`
so the app can run in a deployed environment with maps and data fully
wired.

Acceptance criteria:
* Production environment has required variables documented and set
  (Postgres, Auth.js, Google Maps where applicable).
* Prisma migrations apply cleanly in CI and production deploy flow.
* Map integration can be enabled via the `map` flag (Admin → Settings —
  see `docs/design.md`'s "Dynamic feature flags" amendment) and
  renders with a live API key and Map ID
  (`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, required for `AdvancedMarkerElement`
  markers) in the deployed environment.
* Smoke test config in `output/configs/` is current and reproducible.

### [x] User access restrictions
Design brief:
Implement invite-only access from `docs/design-access-control.md` with
Google sign-in, whitelist enforcement, request-access flow, and admin
management of access.

Acceptance criteria:
* [x] With `FEATURE_AUTH_GATE=true`, unauthenticated users are redirected
  to sign-in for protected routes.
* [x] Signed-in users not in `AllowedUser` cannot access app content and
  are shown a request-access screen.
* [x] Request-access action is idempotent for pending requests per email
  (DB-level partial unique index, not just an app-side check).
* [x] Admin users can approve/deny requests and directly manage
  allowlisted users (add/remove/toggle admin) at `/admin`.
* [x] Non-admin users cannot access admin routes or admin actions
  (`requireAdmin()`, checked independently in every admin action).
* [x] Seed data guarantees at least one bootstrap admin account
  (`shane.preater@gmail.com`).
* [x] Automated tests cover gate behavior, whitelist checks, and
  admin-only actions (100 unit/component tests + integration tests
  against real Postgres, including a real concurrent-request race test
  proving the DB-level dedupe).

Delivered behind `FEATURE_AUTH_GATE` (whole-app gate) and `FEATURE_ADMIN`
(the `/admin` route itself) — both default off. Verified against the
real Google OAuth app (not just mocks): unauthenticated requests to `/`,
`/submit`, and `/admin` all correctly redirect to `/api/auth/signin`
with the right `callbackUrl`, and the real Google sign-in page renders.
Not yet covered: admin pebble management (add/move/verify) — that's the
separate "MVP admin section" entry below.

### [x] MVP admin section
Design brief:
Deliver admin pebble management workflows on top of the access-control
gate and existing pebble storage model. See
[docs/design-admin-pebbles.md](design-admin-pebbles.md).

Scope:
* [x] Add pebble by lat/long.
* [x] Add pebble by place lookup (reuse existing lookup component behavior).
* [x] Move pebble location.
* [x] Accept or verify submitted pebbles.

Acceptance criteria:
* [x] All admin pebble mutations require admin authorization
  (`assertAdminFeatureEnabled()` + `requireAdmin()`, checked
  independently in `addPebbleAction`/`verifyPebbleAction`/
  `movePebbleAction`, same as every other admin action).
* [x] Newly submitted pebbles remain `PENDING` until verified (unchanged
  — admin-added pebbles are the one exception, created already
  `VERIFIED` since there's no separate submitter to verify against).
* [x] Verified pebbles appear on map data source; pending ones do not
  (unchanged `getVerifiedPebbles()`; both admin actions that touch
  public data `revalidatePath("/")` alongside `/admin`).
* [x] Move workflow updates persisted coordinates and is reflected on
  map.
* [x] All flows are covered by unit/integration tests (data layer,
  actions, UI — 26 new/updated test files), plus a local-only end-to-end
  admin path (`e2e/admin-pebbles.spec.ts`, real Postgres + a mocked
  NextAuth session, not run in CI — see
  [docs/design-admin-pebbles.md](design-admin-pebbles.md)) and a manual
  browser smoke test.

Delivered behind the existing `FEATURE_ADMIN` flag — no new flag needed
since this is new functionality on an already-gated surface.

### [ ] Fly-by mode
Design brief:
Provide a chronological playback mode that visualizes Tim's pebble
journey over time using existing pebble date/location fields.

Acceptance criteria:
* Playback orders points by `depositedAt` ascending.
* User can start, pause, resume, and restart playback.
* Current active location is visually distinct from historical points.
* Playback works on desktop and mobile viewports.
* Feature is behind a dedicated flag and defaults off.

### [ ] What3words support
Design brief:
Allow location entry via what3words addresses as an alternative to
lat/long and place-name geocoding.

Acceptance criteria:
* User can enter a valid what3words address and resolve it to
  coordinates.
* Invalid what3words input returns a clear validation error.
* Resolved coordinates flow through existing pebble create/update
  validation and persistence.
* Provider API key/config is documented and handled securely.
* Feature is behind a dedicated flag and defaults off.

### [ ] Associate a photo with a location
Design brief:
Support uploading and storing a photo per pebble, with safe validation,
storage, and display behavior. See
[docs/finops-report.md](finops-report.md) for the storage-backend cost
analysis (recommends Vercel Blob) to build the implementation against.

Implementation progress:
* [x] Design doc written: [docs/design-pebble-photos.md](design-pebble-photos.md).
* [x] Prisma model extended with nullable `Pebble.photoUrl` plus
  migration `20260725155026_pebble_photos`.
* [x] Added explicit dependencies: `@vercel/blob` and `sharp`.
* [x] Photo validation and Blob upload/delete data layer
  (`src/lib/pebble-photos.ts`) with unit tests.
* [x] Action wiring (`submitPebbleAction`, `addPebbleAction`,
  `removePebblePhotoAction`) with unit tests.
* [x] Submit/admin UI upload controls + map/admin photo display
  (`PebblePhoto` component with graceful fallback).
* [x] Map pins show a thumbnail marker when a pebble has `photoUrl` and
  photo features are enabled.
* [x] Feature flag + env/config + local-only Blob e2e test scaffold.
* [x] Lint + unit + integration + CI-safe e2e checks run.
* [x] Real Blob e2e execution (`npm run test:e2e:blob`) with a configured
  `BLOB_READ_WRITE_TOKEN`.
* [x] Local smoke checks of submit/admin/map photo flows.

Validation notes:
* `npm test`, `npm run test:integration` (with local Postgres),
  `npm run test:e2e`, and `npm run test:e2e:admin` are passing.
* `npm run test:e2e:blob` now passes locally with
  `BLOB_READ_WRITE_TOKEN` set.
* `npm run test:e2e:admin` and `npm run test:e2e:map` pass locally
  (map config now forces `FEATURE_AUTH_GATE=false` for smoke stability).
* `npm run build` fails in this sandboxed environment because Google
  Fonts (`Geist`, `Geist Mono`) cannot be fetched; this is an existing
  environment/network limitation unrelated to pebble-photo code paths.
* **Production incident (2026-08-09)**: first real testers hit a hard
  413 submitting a photo — Vercel Functions hard-cap request bodies at
  4.5 MB, which local dev never exercises. Fixed by moving to a
  client-side direct-to-Blob upload; see
  [docs/design-pebble-photos.md](design-pebble-photos.md)'s
  "Amendment (2026-08-09)" section for the full design and root cause.

Acceptance criteria:
* Supported image formats and max size are validated server-side.
* Upload stores media in the selected storage backend and persists a
  reference on pebble records.
* Broken/missing media references fail gracefully in UI.
* Authorization rules are enforced for who can add/remove photos.
* Feature is behind a dedicated flag and defaults off.

### [x] Delete a pebble (admin)
Design brief:
Live-testing feedback (2026-08-09): there's currently no way to remove
a pebble entirely — only verify, move, or (if it has a photo) clear
the photo. Add admin-only deletion for pending or verified pebbles.
See [docs/design-admin-pebbles.md](design-admin-pebbles.md)'s
"Amendment (2026-08-10)".

Acceptance criteria:
* [x] Admin can delete any pebble (pending or verified) from `/admin`.
* [x] Deletion requires confirmation (accidental clicks shouldn't
  destroy memorial data with no recovery path) — `ConfirmForm`, a new
  shared component (`window.confirm()` before submitting).
* [x] If the pebble has a photo, the associated Blob object is deleted
  too (reuses `deletePebblePhoto()` — same as `removePebblePhotoAction`).
* [x] Deletion is `requireAdmin()`-gated, independent of the UI, same
  "route protection policy" as every other admin action
  (`docs/design-access-control.md`).
* [x] Map/admin views revalidate after deletion (`revalidatePath("/admin")`
  and `revalidatePath("/")`, matching every other mutating admin
  action).
* [x] Covered by unit tests (`deletePebble` in `pebbles.test.ts`,
  `deletePebbleAction` in `admin/actions.test.ts`, button/confirm
  behavior in `AdminPebbles.test.tsx`) and a local-only e2e step
  appended to `e2e/admin-pebbles.spec.ts`.

### [x] Orphaned photo-upload cleanup (admin)
Design brief:
A byproduct of the client-upload architecture in
[docs/design-pebble-photos.md](design-pebble-photos.md)'s "Amendment
(2026-08-09)": a photo now uploads to Blob (under the `pebbles-raw/`
prefix) as soon as it's selected, before the form is submitted. If the
submitter abandons the form (closes the tab, never clicks Submit,
picks a different photo instead), that raw upload is never processed
or deleted — an orphan. Needs an admin-facing way to find and clear
these out. See [docs/design-pebble-photos.md](design-pebble-photos.md)'s
"Amendment (2026-08-10)".

Acceptance criteria:
* [x] Admin can list raw uploads under `pebbles-raw/` that are older
  than some threshold (a submission in progress shouldn't be swept
  mid-fill) via Blob's `list()` API — admin-adjustable (default 15
  minutes), not fixed; see "Dynamic feature flags" below.
* [x] Admin can delete individual orphans or bulk-clear all of them.
* [x] Action is `requireAdmin()`-gated, same as every other admin
  mutation.
* [x] Covered by unit tests (`pebble-photo-orphans.test.ts` with
  mocked Blob `list`/`del`, `admin/actions.test.ts`, and
  `ManageOrphanedPhotos.test.tsx`).

### [x] Dynamic feature flags
Design brief:
Surfaced while building the orphan-cleanup delay above: a hardcoded
threshold meant a code change + redeploy every time it needed
adjusting during live testing — the same friction `map`/
`submitPebble`/`pebblePhotos` already had as `NEXT_PUBLIC_*` env vars.
Move both onto one admin-toggleable, DB-backed mechanism. See
[docs/design.md](design.md)'s "Amendment (2026-08-10): Dynamic feature
flags".

Acceptance criteria:
* [x] `map`, `submitPebble`, `pebblePhotos` are stored in a new
  generic `AppSetting` (key/value) table, not env vars.
* [x] Admin can toggle each on/off from `/admin` → Settings, with no
  redeploy required.
* [x] `FEATURE_ADMIN`/`FEATURE_AUTH_GATE` stay env-var-based
  (`authGate` structurally can't move — read on the Edge runtime in
  `proxy.ts`, no Prisma access there).
* [x] A fresh/unseeded database fails closed (flags off), not open;
  `prisma/seed.ts` seeds all three `"true"` so the already-live site
  doesn't regress the moment this migration deploys.
* [x] No loading-flicker regression on flag-gated client UI — flags
  reach client components via React Context seeded from a server-
  fetched value (`FeatureFlagsProvider`), not a client-side fetch on
  mount.
* [x] `GET /api/config` remains available as a general-purpose,
  necessarily-public endpoint for the same data.
* [x] Covered by unit tests across the full call chain: `app-settings.ts`,
  `dynamic-feature-flags.ts`, the API route, `FeatureFlagsProvider`,
  `ManageFeatureFlags`, and every consumer (`Map`, `SubmitPebbleForm`,
  `AdminAddPebbleForm`, `AdminPebbles`, both upload-token routes,
  `page.tsx`/`submit/page.tsx`/`submit/actions.ts`/`admin/actions.ts`).

### [x] Multiple photos per pebble
Design brief:
Live-testing feedback (2026-08-09): a main photo plus additional ones
per pebble, not just the single photo the current
`Pebble.photoUrl` column supports.

Shipped narrower than originally sketched below: rather than migrating
`photoUrl` into a join table, `Pebble.photoUrl` stays exactly as the
primary photo, and a new `PebbleAdditionalPhoto` table holds 0..N
additional photos purely on top of it — no data migration, no change
to any existing pebble. See `docs/design-pebble-photos.md`'s
"Amendment (2026-08-10): multiple photos per pebble" for the full
design (data model, admin-configurable max count, the
`PebblePhotoCarousel` display, and why additional photos can be added
both at creation time and later by an admin, unlike the primary photo
which is creation-time only).

Acceptance criteria:
* [x] A pebble can have zero, one, or many additional photos, on top
  of its one primary photo.
* [x] The primary photo (if any) is shown on map markers/thumbnails;
  additional photos are reachable from the map's InfoWindow (as a
  carousel) and the admin view.
* [x] Upload/delete authorization: additional photos can be added at
  creation time (matches the primary photo's existing policy) or later
  by an admin; removed only by an admin, any time.
* [x] Feature remains behind the existing `pebblePhotos` flag (Admin →
  Settings, DB-backed) — no new dedicated flag needed.

### [ ] Domain launch hardening (trackingtim.com)
Design brief:
Harden production cutover for the custom domain and auth flow so launch
issues are caught by checklist rather than in live traffic.

Note: the `www.trackingtim.com` vs `trackingtim.com` cookie split is
fixed — `src/proxy.ts` now redirects `www` to the apex before `auth()`
runs, since Auth.js's session cookie is host-only. Found in production:
an admin (whitelisted, not the site owner) got 400 "Sign in required to
submit a pebble." from photo uploads on `www` while another admin on
the apex the whole time saw no issue. Remaining acceptance criteria
below are still open.

Acceptance criteria:
* DNS/SSL ownership and verification steps are documented for
  `trackingtim.com` and `www.trackingtim.com` (if used).
* Auth.js Google OAuth callback URLs include local and production hosts,
  and the expected callback behavior is smoke-tested post-deploy.
* Production environment variables are listed in one place with owner,
  source of truth, and last verified date.
* A post-cutover smoke checklist exists (home, map, submit, admin,
  access gate sign-in/sign-out).

### [ ] Admin audit trail
Design brief:
Record who changed what for sensitive admin actions to improve support,
debugging, and trust.

Acceptance criteria:
* Admin actions (verify pebble, move pebble, approve/deny access,
  remove photo, allowlist changes) persist audit entries.
* Each entry captures actor identity, action type, target entity,
  before/after key fields where relevant, and timestamp.
* Audit entries are queryable for at least basic filtering by action,
  actor, and date range.
* Tests cover write-path behavior for each audited action.

### [ ] Backup and restore runbook
Design brief:
Create and verify a repeatable recovery process for memorial data.

Acceptance criteria:
* A documented restore procedure exists for Postgres and Blob data.
* Recovery roles/responsibilities are documented (who executes restore,
  who validates results).
* A test restore is performed in a non-production environment and the
  outcome is recorded.
* Recovery checklist includes data verification steps for pebbles,
  photos, and access control records.

### [ ] Rate limiting and abuse protection
Design brief:
Protect write endpoints from accidental or malicious bursts while
preserving expected user flows.

Acceptance criteria:
* Rate limits are enforced on submit, request-access, and photo upload
  write paths.
* Limit responses are user-readable and do not leak internals.
* Limits and tuning knobs are documented per route.
* Tests cover in-limit and over-limit behaviors.

### [ ] Blob storage hygiene
Design brief:
Prevent orphaned media and keep storage tidy as photos are removed or
records change over time.

Acceptance criteria:
* A safe cleanup workflow exists to detect and optionally remove orphaned
  blob objects not referenced by `Pebble.photoUrl`.
* Cleanup supports dry-run mode and logs affected keys/URLs.
* Cleanup workflow is documented and runnable by maintainers.

### [ ] Error monitoring and alerting
Design brief:
Add lightweight production observability so failures are detected early
and triaged quickly.

Acceptance criteria:
* Unhandled server-side errors are captured in a monitoring system.
* Alerts are configured for recurring failures in critical flows
  (sign-in, submit, admin mutations).
* Monitoring setup and ownership are documented.

### [x] UI redesign
Design brief:
Redesign the visual layer to a more intentional design-token-driven
system while preserving existing feature flags and behaviors. See
[docs/design-ui-redesign.md](design-ui-redesign.md) (deviates from the
original "Material-inspired" phrasing below — see that doc's decision
table for why).

* [x] The admin screen has a tab header for the different sections
  (`AdminTabs`, `?tab=access|pebbles`) rather than a continuous list.
* [x] There's a standard header at the top with a logo (Tim's photo)
  which allows users to easily get back to the main home screen
  (`SiteHeader`, present on every page regardless of auth-gate state).

Acceptance criteria:
* [x] Shared design tokens are defined (color, spacing, type scale,
  elevation/state styles) — `src/app/globals.css`'s `@theme` block and
  `.heading-*`/`.card`/`.input`/`.link` component classes.
* [x] Core screens (home/map, submit, auth-gated states, admin) use the
  new visual system consistently — every native `<button>`/list-row/
  input across the app moved to the shared primitives (`Button`,
  `ButtonLink`, `PageContainer`, `.card`, `.input`).
* [x] Responsive layout works on common mobile and desktop widths —
  checked at 375px and 1280px.
* [x] Accessibility baseline is met: explicit `focus-visible` rings on
  every interactive element (none existed before), WCAG AA contrast
  verified for the new palette in both light and dark mode (weakest
  pair 4.83:1, all others comfortably higher), single `h1` per page
  with consistently-nested `h2`/`h3` subsections.
* [x] Existing functional tests remain green — every restyled component
  kept its DOM shape (real `<button>`/`<input>`, same accessible roles/
  text), so no test rewrites were needed, only re-runs.

Also fixed along the way: `proxy.ts`'s auth-gate matcher never exempted
`public/` static assets, so `/tim.jpg` (the header logo/favicon source)
itself redirected to sign-in once `FEATURE_AUTH_GATE` was on — see
[docs/design-ui-redesign.md](design-ui-redesign.md) for detail.

## Domain data contract: Pebble

Each pebble currently carries:
* Latitude/longitude location (DB `CHECK` constraints enforce valid
  ranges, alongside app-level validation).
* Deposited-by display name (editable).
* Immutable submitter email (`submitterEmail`, nullable — set when
  `FEATURE_AUTH_GATE` is on and the submitter is signed in; `null` for
  pre-auth submissions and seed/admin-added data).
* Deposited date.
* Moderation status (`PENDING`/`VERIFIED`).

Implementation note:
`submitterEmail` is captured from the session at submission time,
independent of whatever the submitter edits the `depositedBy` display
name to — see `docs/design-access-control.md`'s "Interaction with
existing features".
