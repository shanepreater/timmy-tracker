# Documentation index

* [design.md](design.md) — architecture and stack decisions for the
  base framework (Next.js, Postgres/Prisma, Google Maps, admin SSO).
* [design-pebble-photos.md](design-pebble-photos.md) — photo upload,
  storage, moderation/removal rules, and UI fallback behavior.
* [features.md](features.md) — the shopping list of outstanding
  features, and the process for picking up and closing them out. Check
  here before proposing new work; git history has anything already
  closed.

## Conventions

* Every feature gets a design note (either its own doc, or a section in
  `design.md`) before implementation starts, following the workflow in
  the root `CLAUDE.md`.
* New behaviour ships behind a feature flag (see `src/lib/feature-flags.ts`)
  until it's promoted, so the deployed site stays usable mid-feature.
