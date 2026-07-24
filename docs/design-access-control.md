# Design: Access control (invite-only whitelist)

Status: proposed (revised after review — see "Review findings" at the
bottom for what changed and why)
Related feature: "Access control" in `docs/features.md` — supersedes the
inline auth notes on the MVP's "Simple admin section" bullet, which
this document replaces with a fuller design.

## Context

Timmy Tracker was originally designed as a public memorial site: anyone
could view the map, and anyone could submit a pebble (landing as
`PENDING` until an admin verified it). That's no longer the goal —
the whole app should require Google sign-in, restricted to a
whitelist of known people (family/friends), with a self-service way
for someone new to ask to be let in.

This also folds in and resolves an earlier open thread: the
submit-a-pebble form was going to separately require login so
`depositedBy`/an avatar could come from a real Google identity. That's
now just a consequence of the whole app being gated — no separate
auth mechanism needed for the submit form specifically.

## Decisions

| Concern | Choice | Why |
|---|---|---|
| Auth provider | Auth.js (NextAuth v5) + Google OAuth, JWT session (no Prisma adapter) | Already the planned mechanism (`docs/design.md`). JWT-only keeps Auth.js's own `Account`/`Session`/`User` tables out of our schema entirely — the session cookie only proves *which* Google account signed in; whitelist/admin status is our own lookup, decoupled from Auth.js's data model. |
| Where the gate runs | Split across two runtimes: `middleware.ts` (Edge, JWT-only check → redirect to sign-in if unauthenticated) + root layout (Node, Server Component → whitelist DB check → renders the app or a "request access" page) | Prisma needs the Node.js runtime; Next.js middleware runs on Edge by default and can't safely make a DB call. Splitting "are you signed in" (cheap, Edge-safe) from "are you allowed in" (needs the DB) avoids that mismatch. |
| Whitelist storage | New `AllowedUser` table (email, name, isAdmin, createdAt) | A DB table (not an env var) so admins can add/remove people themselves through a UI, per the ask — no redeploy needed to let someone in. |
| Access requests | New `AccessRequest` table (email, name, status, requestedAt, resolvedAt, resolvedByEmail, note) | Self-service: an authenticated-but-not-whitelisted visitor gets a "Request access" button instead of a dead end. Admins approve/deny from the admin UI; approving creates the `AllowedUser` row. |
| Feature flag | `FEATURE_AUTH_GATE` (server-only, no `NEXT_PUBLIC_` prefix) | The gate is enforced entirely server-side (middleware + layout), so the client never needs to know its state. Off by default so the gate can be built and tested without locking anyone out mid-development — see "Fail-open risk" below for how we avoid this biting us in production. |
| Email identity | Canonicalized (trimmed + lowercased) before storing or comparing, everywhere | Google emails are effectively case-insensitive; Postgres unique constraints aren't. Without normalizing, `Shane@x.com` and `shane@x.com` would be treated as different people. |

## Data model

```prisma
model AllowedUser {
  id        String   @id @default(cuid())
  email     String   @unique // always stored normalizeEmail()'d
  name      String?
  isAdmin   Boolean  @default(false)
  createdAt DateTime @default(now())
}

enum AccessRequestStatus {
  PENDING
  APPROVED
  DENIED
}

model AccessRequest {
  id              String              @id @default(cuid())
  email           String              // always stored normalizeEmail()'d
  name            String?
  status          AccessRequestStatus @default(PENDING)
  requestedAt     DateTime            @default(now())
  resolvedAt      DateTime?
  resolvedByEmail String?             // which admin approved/denied this
  note            String?             // optional admin note (e.g. reason for denial)
}
```

`Pebble` gains one field, alongside the existing editable `depositedBy`:

```prisma
model Pebble {
  id             String       @id @default(cuid())
  latitude       Float
  longitude      Float
  depositedBy    String       // editable display name — unchanged
  submitterEmail String?      // NEW: immutable, captured from the session at submission time
  depositedAt    DateTime
  status         PebbleStatus @default(PENDING)
  createdAt      DateTime     @default(now())
  verifiedAt     DateTime?
}
```

`submitterEmail` is a plain string, not a foreign key to `AllowedUser` —
if someone's access is later revoked (row deleted), their past
submissions should still show who really submitted them rather than
cascading into orphaned/null history. It's nullable so admin-added and
existing/seeded pebbles (no session behind them) don't need a value.

### Database-level constraints (not just app-level)

App-level validation (`pebble-validation.ts`'s lat/long range checks,
the "one pending request per email" check before creating a row) is
necessary but not sufficient — concurrent requests can race past an
app-level check between the read and the write. Two constraints get
added via raw SQL in a migration (Prisma's schema DSL doesn't support
partial indexes or `CHECK` constraints directly):

```sql
-- Only one PENDING access request per (normalized) email at a time —
-- closes the race an app-level "check then create" can't.
CREATE UNIQUE INDEX access_request_pending_email_unique
  ON "AccessRequest" (email)
  WHERE status = 'PENDING';

-- Defense in depth alongside pebble-validation.ts's range checks.
ALTER TABLE "Pebble" ADD CONSTRAINT pebble_latitude_range
  CHECK (latitude BETWEEN -90 AND 90);
ALTER TABLE "Pebble" ADD CONSTRAINT pebble_longitude_range
  CHECK (longitude BETWEEN -180 AND 180);
```

Approve/deny on an `AccessRequest` runs inside a Prisma
`$transaction` (check current status is still `PENDING` → update it →
upsert the `AllowedUser` row), so two admins clicking Approve on the
same request at the same moment can't both succeed.

## Flow

1. Visit any page → `middleware.ts` checks for a valid session (JWT
   only, no DB). No session → redirect to sign-in.
2. Signed in (any Google account) → root layout checks `AllowedUser`
   by normalized email:
   - **In the list** → render the app normally (home/map, submit;
     `/admin` too if `isAdmin`).
   - **Not in the list** → render a "Request access" page: a message
     plus a button. Clicking it creates a `PENDING` `AccessRequest`
     (the partial unique index above is what actually guarantees no
     duplicates, not just the pre-check) and shows "Request sent —
     we'll let you know."
3. Admins (`isAdmin = true`) get a "Manage users" admin view:
   - Pending `AccessRequest`s, with **Approve** (transactionally
     creates/updates the `AllowedUser` row, marks the request
     `APPROVED`, records `resolvedByEmail`) / **Deny** (`DENIED` +
     `resolvedByEmail`, optional `note`) actions.
   - The current `AllowedUser` list, with add/remove and an `isAdmin`
     toggle, so admins can manage the whitelist directly without
     waiting for a request.

## Route protection policy

The middleware/layout split above protects *page navigations*. It is
**not** the only enforcement point. Every mutating server entrypoint —
every server action, every admin route handler — independently
verifies authorization itself, rather than trusting that a request
only ever arrives via the gated UI. This matches the pattern already
used for `submitPebbleAction` (which checks `featureFlags.submitPebble`
itself instead of trusting that `/submit` was gated).

Two shared helpers, used at the top of every server action/route that
needs them:

```ts
// src/lib/auth-guards.ts
export async function requireAllowedUser(): Promise<AllowedUser> { /* throws if unauthenticated or not whitelisted */ }
export async function requireAdmin(): Promise<AllowedUser> { /* throws if not isAdmin */ }
```

* `submitPebbleAction` → `requireAllowedUser()`.
* Every admin action (verify/move/add pebble, approve/deny request,
  manage `AllowedUser`) → `requireAdmin()`.

`middleware.ts`'s matcher applies to all routes **except**: Auth.js's
own routes (`/api/auth/*`), the sign-in page itself (to avoid a
redirect loop), and static assets (`_next/*`, `favicon.ico`, etc.).

## Fail-open risk (flag defaults off)

`FEATURE_AUTH_GATE` defaulting to `false` is deliberate for
development, but the same default in a misconfigured production
deploy would silently leave the whole site public. Rather than a hard
crash (too aggressive for a low-stakes family site, and it'd be an
unpleasant way to discover a misconfigured env var during a deploy),
the app logs a loud, impossible-to-miss warning on server startup when
running in what looks like production (`VERCEL_ENV === "production"`)
with the flag off:

```
⚠️  FEATURE_AUTH_GATE is OFF in production — the site is fully public.
```

This makes the misconfiguration visible in Vercel's logs immediately
rather than something discovered later.

## Interaction with existing features

* **Submit a pebble** — once this lands, `depositedBy` on the
  submit form will default to the signed-in user's Google name
  (editable, per the earlier decision) and their avatar URL will be
  stored alongside the pebble for display on the map. `submitterEmail`
  (see data model above) gets recorded regardless of what the
  submitter edits `depositedBy` to. This is its own follow-on slice on
  top of the base gate, not part of this PR.
* **`FEATURE_ADMIN`** (existing flag) — kept as-is for now, gating
  whether the `/admin` route exists at all, on top of (not instead of)
  the per-user `isAdmin` check. May become redundant once the admin
  section is fully built and can be removed then.

## Deferred (tracked separately, not part of this PR)

* Storing/displaying submitter avatars on the map.
* Email notifications for new access requests — admins currently have
  to check the admin UI; no email service is wired up.
* Admin pebble management (add/move/verify) — separate slices on top
  of this gate, per `docs/features.md`.

## Open questions

* No cooldown on re-requesting after a denial — simplest thing for
  MVP; revisit if it becomes a problem in practice.
* No shared header/nav exists yet across pages; a sign-out link will
  need one. Scoped into the implementation PR rather than called out
  as a separate feature, since it's small and load-bearing for this
  change (people need a way to sign out).

## Review findings (addressed above)

A design review caught several gaps in the first draft; each is now
folded into the sections above rather than left as a TODO:

* **Pending-request dedup was app-layer only** → added the partial
  unique index (`Data model`) and transactional approve/deny.
* **Route/action protection was under-specified** → added the "Route
  protection policy" section: every mutating entrypoint checks itself.
* **No email normalization rule** → added to the decisions table and
  data model comments.
* **No audit trail on approve/deny** → added `resolvedByEmail` + `note`
  to `AccessRequest`.
* **`depositedBy` alone is weak provenance once auth exists** → added
  `submitterEmail` to `Pebble`.
* **Flag-off-in-prod could fail open silently** → added the startup
  warning described above.
* **No DB-level lat/long constraints** → added `CHECK` constraints
  alongside the existing app-level validation.
