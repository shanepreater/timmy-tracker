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

## Backlog

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
* Map integration can be enabled via `NEXT_PUBLIC_FEATURE_MAP=true` and
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
storage, and display behavior.

Acceptance criteria:
* Supported image formats and max size are validated server-side.
* Upload stores media in the selected storage backend and persists a
  reference on pebble records.
* Broken/missing media references fail gracefully in UI.
* Authorization rules are enforced for who can add/remove photos.
* Feature is behind a dedicated flag and defaults off.

### [ ] UI redesign
Design brief:
Redesign the visual layer to a more intentional Material-inspired system
while preserving existing feature flags and behaviors.

The admin screen should have a tab header for the different sections rather than a continuous list.

There should be a standard header at the top with a logo which allows users to easily get back to the main home screen.

Acceptance criteria:
* Shared design tokens are defined (color, spacing, type scale,
  elevation/state styles).
* Core screens (home/map, submit, auth-gated states, admin) use the new
  visual system consistently.
* Responsive layout works on common mobile and desktop widths.
* Accessibility baseline is met (keyboard navigation, visible focus,
  contrast checks, semantic headings/landmarks).
* Existing functional tests remain green; visual update does not regress
  core workflows.

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
