# Design: Admin pebble management

Status: implemented
Related feature: [MVP admin section](features.md) in `docs/features.md`

## Context

`docs/design.md` established `Pebble.status` (`PENDING`/`VERIFIED`) so the
public "submit a pebble" flow and an admin verification flow could share
one table, but only the submit side has ever been built. This closes the
loop: admins need to see what's pending, verify it onto the public map,
correct a location that turns out to be wrong, and add a pebble directly
without going through the public form (e.g. entering historical
placements on Tim's behalf).

This builds directly on top of `docs/design-access-control.md`'s
`/admin` route and `requireAdmin()` guard — no new auth mechanism is
needed here.

## Decisions

| Concern | Choice | Why |
|---|---|---|
| Feature flag | Reuse `FEATURE_ADMIN`, no new flag | This is new functionality on an already-flagged surface (`/admin`, off by default). A second flag would only let us decouple "manage users" from "manage pebbles" within the same gated page, which nobody has asked for — see `docs/design-access-control.md`'s admin actions, which followed the same reuse-the-existing-flag approach. |
| Admin-added pebbles | Created as `VERIFIED` immediately, `submitterEmail: null` | An admin typing in a pebble directly is trusted input with no separate submitter to verify against — self-verifying is the correct default, and matches the existing documented contract that `submitterEmail` is null for "seed/admin-added data" (`docs/features.md`'s Pebble data contract, already written before this feature existed). |
| Verify action concurrency | Plain `update`, no conditional `updateMany` | Unlike `approveAccessRequest` (`docs/design-access-control.md`), two admins verifying the same pebble at once isn't destructive — both writes converge on the same end state (`status: VERIFIED`, a `verifiedAt` a few ms apart). No data is silently lost, so the extra machinery isn't justified here. |
| Move (edit location) | Reuses `validateSubmitPebbleInput`'s lat/long parsing | Same range rules as the public form and the DB `CHECK` constraints — one validation function, not a second copy of "is this a valid latitude." |
| Place lookup on the add-pebble form | Extract `PlaceLookup` out of `SubmitPebbleForm.tsx` into its own component | The admin add-pebble form needs the same "type a place name, resolve via Geocoding API" behavior `SubmitPebbleForm` already has. Duplicating that component would mean two copies of the same Google Maps geocoding call to keep in sync. |
| Reject/delete a pending pebble | Not built | Not in `docs/features.md`'s acceptance criteria for this feature (only "accept or verify"). Noted under Deferred below so a future session doesn't assume it was considered and rejected. |

## Data model

No schema changes — `Pebble` already has everything needed
(`docs/design.md`, extended by `docs/design-access-control.md`'s
`submitterEmail` and the lat/long `CHECK` constraints). This feature is
new data-layer functions and UI on the existing table only.

## New data-layer functions (`src/lib/pebbles.ts`)

* `listAllPebbles()` — every pebble (`PENDING` and `VERIFIED`), for the
  admin view. `getVerifiedPebbles()` (public map) is unchanged.
* `createPebbleByAdmin(input)` — same `SubmitPebbleInput` shape as the
  public submit path, but creates with `status: VERIFIED`,
  `verifiedAt: now()`, `submitterEmail: null`.
* `verifyPebble(id)` — sets a `PENDING` pebble to `VERIFIED` with
  `verifiedAt: now()`.
* `movePebble(id, latitude, longitude)` — updates coordinates on an
  existing pebble, regardless of status.

## Route protection policy

Same policy as `docs/design-access-control.md`: every mutating action is
independently authorized, not just reachable only through a gated page.
All three new actions in `src/app/admin/actions.ts`
(`addPebbleAction`, `verifyPebbleAction`, `movePebbleAction`) call the
existing `assertAdminFeatureEnabled()` then `requireAdmin()` first, before
touching the database — identical shape to the existing access-request
and allowed-user actions in that file.

## Flow

1. Admin opens `/admin` (already gated: `FEATURE_ADMIN` +
   `requireAdmin()`).
2. A new "Pebbles" section lists pending submissions (with Verify
   buttons) and existing verified pebbles (each with an inline
   move-location form), plus an "Add pebble" form (lat/long fields, an
   optional place-lookup box reusing `PlaceLookup`, deposited-by, and
   date).
3. Verifying or adding a pebble calls `revalidatePath("/admin")` *and*
   `revalidatePath("/")`, since the public map's pebble list
   (`getVerifiedPebbles()`) needs to reflect the change immediately —
   the existing admin actions only ever revalidated `/admin`, since none
   of them affected public-facing data before this.

## Interaction with existing features

* `getVerifiedPebbles()` (`src/lib/pebbles.ts`) and `Map.tsx` are
  unchanged — a verified pebble created or moved through this feature is
  indistinguishable to the public map from one created via
  `submitPebbleAction`.
* `PlaceLookup` extraction is the only change to `SubmitPebbleForm.tsx`;
  its public submit behavior (validation, `useActionState`, error
  display) is untouched.

## Deferred (tracked separately, not part of this change)

* **Reject/delete a pending pebble** — an admin currently can only
  verify or ignore a pending submission, not remove a clearly bogus one.
  Small in isolation but needs its own decision on soft- vs hard-delete
  and whether a rejected submitter is notified; worth a future
  `docs/features.md` entry rather than folding in here.
* **Bulk verify** — out of scope for a low-volume, family-and-friends
  site; not worth the UI complexity yet.
