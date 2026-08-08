# Guide: Deploying to Vercel for user testing

Status: guide (not a design doc — no design decision is being proposed
here, `docs/design.md` already chose Vercel/Postgres/Auth.js/Blob).
Purpose: get a real, working URL in front of family/friends so they can
start testing, without waiting on the full "CI/CD pipeline and
deployment" or "Domain launch hardening" backlog items in
[docs/features.md](features.md).

## What's already true

* The GitHub repo is already connected to a Vercel project
  (`timmy-tracker`, under the `shane-1b7c` team) via Vercel's GitHub
  App. That's why every PR already gets a preview deployment and a
  `Vercel` check — see any recent PR.
* Nothing has been deployed to **Production** yet — no environment
  variables are set there, no database is provisioned, and no domain is
  attached (confirmed in
  [docs/finops-report.md](finops-report.md#context)).
* Automated deploy-on-merge gated on CI passing is still open work (see
  "CI/CD pipeline and deployment" in `docs/features.md`) — Vercel's
  GitHub integration deploys independently of the `CI` GitHub Actions
  workflow. This guide gets a manual, working deployment live; it does
  not close that backlog item.

## Overview

1. Provision Postgres and Blob storage from the Vercel dashboard.
2. Set every environment variable Production needs (mirrors
   `.env.example`).
3. Point Google Cloud's OAuth client and Maps API key restrictions at
   the real production URL.
4. Trigger a deploy, run migrations against the production database,
   optionally seed demo data.
5. Smoke-test the live site.
6. Get testers onto the allowlist.

Steps 1–3 are one-time setup. Step 4 (minus migrations) repeats on
every future push to `main` automatically.

### Vercel CLI (optional)

The Vercel CLI is installed as a devDependency (`npx vercel`, no global
install needed — see `scripts/setup.sh`). It's not required — every
step below can be done from the dashboard — but it saves copy-pasting
connection strings for steps 3 and 5. One-time setup if you want it:

```bash
npx vercel login
npx vercel link   # connects this checkout to the timmy-tracker project
```

## 1. Provision Postgres

1. In the Vercel dashboard, open the `timmy-tracker` project →
   **Storage** tab → **Create Database** → **Postgres** (Vercel's
   native offering, powered by Neon — see `docs/design.md`'s hosting
   rationale). Connect it to the project when prompted.
2. This auto-injects several `POSTGRES_*` variables (e.g.
   `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`) into the
   project's Production environment. **Prisma reads `DATABASE_URL`
   specifically** (`prisma/schema.prisma`'s `datasource` block), which
   Vercel does not set for you.
3. Go to **Settings → Environment Variables** and add `DATABASE_URL`
   manually, set to the same value as the generated
   `POSTGRES_PRISMA_URL` (pooled connection — fine for the app's own
   queries; migrations use a direct connection passed explicitly, see
   step 4 below). Scope it to **Production**.

If you'd rather use a standalone Neon project instead of Vercel's
native integration, that's equivalent — `docs/design.md` names both;
just paste that connection string into `DATABASE_URL` instead.

## 2. Provision Blob storage

1. Same **Storage** tab → **Create Database** → **Blob**. Connect it to
   the project.
2. This auto-injects `BLOB_READ_WRITE_TOKEN` into Production directly
   — no manual remapping needed, it's already the name
   `src/lib/pebble-photos.ts` reads.

## 3. Set the remaining environment variables

**Settings → Environment Variables**, scoped to **Production**. These
mirror `.env.example` — see the root `README.md`'s "Getting your keys"
section for how to obtain each one:

| Variable | Value for production |
|---|---|
| `DATABASE_URL` | Set in step 1 |
| `BLOB_READ_WRITE_TOKEN` | Set in step 2 |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Same Google Cloud project as local dev, or a dedicated production key — see step 4 for referrer restrictions |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | From the same Google Cloud project's Map Management |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Same OAuth client as local dev works, as long as the production redirect URI is added — see step 4 |
| `AUTH_SECRET` | Generate a **fresh** value for production: `npx auth secret` — don't reuse your local `.env.local` secret |
| `NEXT_PUBLIC_FEATURE_MAP` | `true` |
| `NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE` | `true` |
| `NEXT_PUBLIC_FEATURE_PEBBLE_PHOTOS` | `true` |
| `FEATURE_ADMIN` | `true` (so you can approve testers and manage pebbles from `/admin`) |
| `FEATURE_AUTH_GATE` | `true` (recommended — this is a private memorial site for a known circle of people, not a public product; see `docs/design-access-control.md`) |

Environment variable changes only take effect on the **next**
deployment — adding these before step 5's first deploy means you only
need one deploy, not a redeploy after.

With the CLI linked (see above), you can pull whatever's already set
instead of copying values by hand: `npx vercel env pull
.env.production.local --environment=production` (gitignored — don't
commit it).

## 4. Update Google Cloud for the production URL

Before testers can sign in, both Google credentials need to know about
the real production URL. Find it under the project's **Domains** tab
(a `*.vercel.app` address, unless you've already attached a custom
domain).

1. **OAuth client** (Cloud Console → APIs & Services → Credentials →
   your OAuth client ID) → **Authorized redirect URIs** → add
   `https://<your-production-url>/api/auth/callback/google` (keep the
   existing `localhost` one for local dev).
2. **Maps API key** (Credentials → your Maps key → *Application
   restrictions* → HTTP referrers) → add
   `https://<your-production-url>/*`.

**Google sign-in only works reliably on the Production URL.** PR
preview deployments get a fresh, random URL per build, which can't be
pre-registered as a redirect URI — so `FEATURE_AUTH_GATE=true` previews
will fail to sign in. Send testers the Production URL, not a preview
link.

## 5. Deploy and run migrations

1. Trigger the first deploy: **Deployments** tab → **Redeploy** on the
   latest `main` build (or just push any commit to `main` — every push
   auto-deploys, per the GitHub integration already connected; or, with
   the CLI linked, `npx vercel --prod`).
2. Apply the schema to the production database — from your machine,
   using the **direct** (non-pooled) connection string this time, not
   the pooled one from step 1 (`prisma migrate deploy` needs a direct
   connection). Copy `POSTGRES_URL_NON_POOLING` from the dashboard, or
   from the `.env.production.local` pulled above:
   ```bash
   DATABASE_URL="<POSTGRES_URL_NON_POOLING value>" npx prisma migrate deploy
   ```
   This is the same command CI runs against its throwaway Postgres
   service — see `.github/workflows/ci.yml`.
3. Seed data (optional, recommended for the first testing round):
   ```bash
   DATABASE_URL="<same direct connection string>" npm run db:seed
   ```
   `prisma/seed.ts` does two things:
   * Inserts ten placeholder pebbles (Eiffel Tower, Golden Gate, etc.)
     so the map isn't empty on first load — these are explicitly
     template data (see the comment at the top of the file) and
     **must be cleared before real launch** with Tim's actual pebble
     locations.
   * Upserts `shane.preater@gmail.com` as a bootstrap admin in
     `AllowedUser`. **Run this before you rely on
     `FEATURE_AUTH_GATE=true`** — otherwise the first sign-in locks
     you out with no admin to approve anyone, including yourself.

## 6. Smoke-test the live site

Visit the Production URL and check, in order:

1. Home page loads, redirects to Google sign-in (gate is on).
2. Sign in with the bootstrap admin account → lands on the home page
   with the map visible.
3. Map renders with pins (seeded data or real data).
4. Submit a pebble (`/submit`), with a photo — status shows "awaiting
   review".
5. `/admin` is reachable for the admin account; the submitted pebble
   appears and can be verified; it then appears on the map.
6. Sign in with a second, non-whitelisted Google account → see the
   "Request access" screen, not the app.
7. Approve that request from `/admin` → the account can now get in.

## 7. Get testers onboarded

Two options, per `docs/design-access-control.md`:

* **Self-service (recommended)**: send testers the Production URL.
  They sign in with Google, hit "Request access", and you approve them
  from `/admin` → Manage users.
* **Pre-seed**: if you want specific people ready to go on day one
  without waiting for you to approve, add rows to `AllowedUser`
  directly (e.g. via `npx prisma studio` pointed at the production
  `DATABASE_URL`) instead of going through the request flow.

## Rolling back

Vercel keeps every previous deployment. If a bad deploy goes to
Production: **Deployments** tab → find the last good one → **⋯ →
Promote to Production**. Instant, no rebuild. (A scripted rollback
runbook is still open — see "CI/CD pipeline and deployment" in
`docs/features.md`.)

## What this guide deliberately doesn't cover

Tracked separately in `docs/features.md`, out of scope for a first
testing round:

* **Custom domain** (`trackingtim.com`, via GoDaddy DNS — cost
  confirmed in `docs/finops-report.md`) — "Domain launch hardening".
  Testers can use the `*.vercel.app` URL in the meantime.
* **CI-gated deploy-on-merge and a scripted rollback runbook** — "CI/CD
  pipeline and deployment". Right now a merge to `main` deploys
  regardless of whether the `CI` GitHub Actions workflow passed.
* **Admin audit trail**, **backup/restore runbook**, **rate limiting**
  — separate backlog entries, not required to let testers in.

Costs at this project's scale (150 pebbles, low traffic) are covered in
[docs/finops-report.md](finops-report.md) — everything above fits
free/Hobby tiers.
