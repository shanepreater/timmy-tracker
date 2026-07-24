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
  renders with live API key in deployed environment.
* Smoke test config in `output/configs/` is current and reproducible.

### [ ] User access restrictions
Design brief:
Implement invite-only access from `docs/design-access-control.md` with
Google sign-in, whitelist enforcement, request-access flow, and admin
management of access.

Acceptance criteria:
* With `FEATURE_AUTH_GATE=true`, unauthenticated users are redirected to
  sign-in for protected routes.
* Signed-in users not in `AllowedUser` cannot access app content and are
  shown a request-access screen.
* Request-access action is idempotent for pending requests per email.
* Admin users can approve/deny requests and directly manage allowlisted
  users (add/remove/toggle admin).
* Non-admin users cannot access admin routes or admin actions.
* Seed data guarantees at least one bootstrap admin account.
* Automated tests cover gate behavior, whitelist checks, and admin-only
  actions.

### [ ] MVP admin section
Design brief:
Deliver admin pebble management workflows on top of the access-control
gate and existing pebble storage model.

Scope:
* Add pebble by lat/long.
* Add pebble by place lookup (reuse existing lookup component behavior).
* Move pebble location.
* Accept or verify submitted pebbles.

Acceptance criteria:
* All admin pebble mutations require admin authorization.
* Newly submitted pebbles remain `PENDING` until verified.
* Verified pebbles appear on map data source; pending ones do not.
* Move workflow updates persisted coordinates and is reflected on map.
* All flows are covered by unit/integration tests, plus at least one
  end-to-end admin path.

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
* Latitude/longitude location.
* Deposited-by display name.
* Deposited date.
* Moderation status (`PENDING`/`VERIFIED`).

Implementation note:
As access control is implemented, keep the display name editable but also
store immutable submitter identity for auditability.
