# Design: Access control (invite-only whitelist)

Status: proposed
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
| Access requests | New `AccessRequest` table (email, name, status, requestedAt, resolvedAt) | Self-service: an authenticated-but-not-whitelisted visitor gets a "Request access" button instead of a dead end. Admins approve/deny from the admin UI; approving creates the `AllowedUser` row. |
| Feature flag | `FEATURE_AUTH_GATE` (server-only, no `NEXT_PUBLIC_` prefix) | The gate is enforced entirely server-side (middleware + layout), so the client never needs to know its state. Off by default so the gate can be built and tested without locking anyone out mid-development. |

## Data model

```prisma
model AllowedUser {
  id        String   @id @default(cuid())
  email     String   @unique
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
  id          String              @id @default(cuid())
  email       String
  name        String?
  status      AccessRequestStatus @default(PENDING)
  requestedAt DateTime            @default(now())
  resolvedAt  DateTime?
}
```

`AccessRequest.email` is intentionally **not** unique — someone denied
once should be able to request again later — but the app layer won't
create a second row while a `PENDING` one already exists for the same
email (shows "request already sent" instead of a duplicate button).

`prisma/seed.ts` seeds `shane.preater@gmail.com` into `AllowedUser`
with `isAdmin = true`, so turning `FEATURE_AUTH_GATE` on never locks
out the owner.

## Flow

1. Visit any page → `middleware.ts` checks for a valid session (JWT
   only, no DB). No session → redirect to sign-in.
2. Signed in (any Google account) → root layout checks `AllowedUser`
   by email:
   - **In the list** → render the app normally (home/map, submit;
     `/admin` too if `isAdmin`).
   - **Not in the list** → render a "Request access" page: a message
     plus a button. Clicking it creates a `PENDING` `AccessRequest`
     (idempotent — won't duplicate an existing pending one) and shows
     "Request sent — we'll let you know."
3. Admins (`isAdmin = true`) get a "Manage users" admin view:
   - Pending `AccessRequest`s, with **Approve** (creates the
     `AllowedUser` row, marks the request `APPROVED`) / **Deny**
     (`DENIED`) actions.
   - The current `AllowedUser` list, with add/remove and an `isAdmin`
     toggle, so admins can manage the whitelist directly without
     waiting for a request.

## Interaction with existing features

* **Submit a pebble** — once this lands, `depositedBy` on the
  submit form will default to the signed-in user's Google name
  (editable, per the earlier decision) and their avatar URL will be
  stored alongside the pebble for display on the map. This is its own
  follow-on slice on top of the base gate, not part of this PR.
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
