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
./scripts/setup.sh   # installs the right Node version and dependencies
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the values described
there before running the app.

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
2. **APIs & Services → Library** → enable **Maps JavaScript API**.
3. **APIs & Services → Credentials → Create credentials → API key**.
4. Restrict the key (Credentials → your key → *Application restrictions*:
   HTTP referrers; *API restrictions*: Maps JavaScript API only) before
   using it anywhere but `localhost`.
5. Paste the key into `.env.local` and set
   `NEXT_PUBLIC_FEATURE_MAP="true"` to turn the map on.

### `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — admin SSO

1. Same Cloud Console project as above → **APIs & Services →
   Credentials → Create credentials → OAuth client ID**.
2. Application type **Web application**.
3. Add an authorized redirect URI:
   `http://localhost:3000/api/auth/callback/google` (swap the host once
   deployed).
4. Copy the generated **Client ID** and **Client secret** into
   `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
5. Generate `AUTH_SECRET` with `npx auth secret` (or
   `openssl rand -base64 32`) and set `FEATURE_ADMIN="true"` once you're
   ready to test the admin area.

## Development

```bash
npm run lint     # ESLint
npm test         # Vitest
npm run build    # Production build
```

## Documentation

See [docs/README.md](docs/README.md) for an index of project
documentation.
