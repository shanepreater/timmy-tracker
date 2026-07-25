# Timmy Tracker

A website, integrated with Google Maps, to track where Tim's memorial
stones have been placed by the people who loved him.

## Stack

* [Next.js](https://nextjs.org) (App Router, TypeScript)
* [Prisma](https://www.prisma.io) + Postgres
* [Auth.js](https://authjs.dev) (Google SSO) for the admin area
* Google Maps JavaScript API

See [docs/design.md](docs/design.md) for the full architecture rationale
and [docs/features.md](docs/features.md) for what's built vs. outstanding.

## Getting started

```bash
./scripts/setup.sh   # one-time: installs the right Node version, dependencies, .env files
./scripts/dev.sh     # every time: starts local Postgres (if installed) + the dev server
```

`scripts/setup.sh` creates `.env.local` from `.env.example` for you if
it doesn't already exist — see "Getting your keys" below to fill in
real values for whichever features you're working on.

### Scripts

* `scripts/setup.sh` — one-time environment bootstrap (Node via nvm, `npm install`, starter `.env`/`.env.local`). Safe to re-run.
* `scripts/dev.sh` — starts local Postgres (if `postgresql@16` is installed via brew) and runs `npm run dev`. Works fine with no Postgres installed too — the app just runs with the map feature off.
* `scripts/db.sh {start|stop|status}` — control the local Postgres service directly, e.g. before running `npm run test:integration`.

## Getting your keys

Everything below is optional for local dev — every feature it unlocks
stays behind a flag defaulted to `false`/off (see `docs/design.md`), so
the app runs fine without any of it. Fill in only what you're working on.

### `DATABASE_URL` — local Postgres

```bash
brew install postgresql@16
brew services start postgresql@16

# one-off: create a dedicated role + database
createuser timmy --pwprompt   # set the password to "timmy", or your own
createdb -O timmy timmy_tracker

npx prisma migrate deploy
```

Then set:

```
DATABASE_URL="postgresql://timmy:timmy@localhost:5432/timmy_tracker"
```

(adjust the password to whatever you set above). Using a dedicated role
and database keeps this project isolated from anything else running on
your local Postgres.

### `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Maps

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   create (or pick) a project.
2. **APIs & Services → Library** → enable **Maps JavaScript API** and
   **Geocoding API** (the latter powers the "look up a place" convenience
   on the submit-a-pebble form — same key, no separate credential).
3. **APIs & Services → Credentials → Create credentials → API key**.
4. Restrict the key (Credentials → your key → *Application restrictions*:
   HTTP referrers; *API restrictions*: Maps JavaScript API + Geocoding
   API) before using it anywhere but `localhost`.
5. **Google Maps Platform → Map Management → Create Map ID** (JavaScript,
   either render type). Pebble markers use `AdvancedMarkerElement` (the
   non-deprecated marker API), which only renders on a map with a Map
   ID — see `docs/design.md`'s Maps row.
6. Paste the API key into `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and the Map
   ID into `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` in `.env.local`, then set
   `NEXT_PUBLIC_FEATURE_MAP="true"` to turn the map on.

### `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — sign-in

1. Same Cloud Console project as above → **APIs & Services →
   Credentials → Create credentials → OAuth client ID**.
2. Application type **Web application**.
3. Add an authorized redirect URI:
   `http://localhost:3000/api/auth/callback/google` (swap the host once
   deployed).
4. Copy the generated **Client ID** and **Client secret** into
   `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
5. Generate `AUTH_SECRET` with `npx auth secret` (or
   `openssl rand -base64 32`).
6. Set `FEATURE_AUTH_GATE="true"` to require sign-in for the whole app
   (whitelisted via the `AllowedUser` table — `prisma/seed.ts` seeds
   `shane.preater@gmail.com` as the bootstrap admin) — see
   `docs/design-access-control.md`. Set `FEATURE_ADMIN="true"` to turn
   on the `/admin` route itself (managing the whitelist, approving
   access requests).

## Development

```bash
npm run lint             # ESLint
npm test                 # Vitest (unit)
npm run test:integration # Vitest against real Postgres
npm run test:e2e         # Playwright — CI-safe, every feature flag off
npm run test:e2e:map     # Playwright — real Google Maps, needs your .env.local key, local only
npm run build            # Production build
```

`npm run test:e2e:map` exercises real Google services — map/marker
rendering and the submit form's place-name lookup (Geocoding API) — so
it's not run in CI (see `docs/design.md`). Each spec skips itself
automatically if `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` isn't set in
`.env.local`.

CI also lints `scripts/*.sh` with [shellcheck](https://www.shellcheck.net/)
and the workflow files under `.github/workflows/` with
[actionlint](https://github.com/rhysd/actionlint), and scans every push
and PR for committed secrets with [gitleaks](https://github.com/gitleaks/gitleaks)
— a detected secret fails the build. Run the same checks locally
(macOS/Homebrew — all three tools are also available via most Linux
package managers and `scoop`/`choco` on Windows):

```bash
brew install shellcheck actionlint gitleaks
shellcheck scripts/*.sh
actionlint
gitleaks detect --source .
```

## Documentation

See [docs/README.md](docs/README.md) for an index of project
documentation.
