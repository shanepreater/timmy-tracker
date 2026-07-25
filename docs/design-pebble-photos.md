# Design: Associate a photo with a location

Status: implemented
Related feature: [Associate a photo with a location](features.md) in
`docs/features.md`

## Context

`docs/finops-report.md` already settled the cost/backend question for
this feature: Vercel Blob, same account as hosting/DB, effectively
free at the confirmed 150-pebble ceiling. This doc covers the parts
that report didn't — where upload happens, who can add/remove a
photo, validation, and how a photo is displayed (including the
graceful-failure case) — closing out the acceptance criteria in
`docs/features.md`'s "Associate a photo with a location" entry.

## Decisions

| Concern | Choice | Why |
|---|---|---|
| Storage backend | Vercel Blob (`@vercel/blob`), public access | Already decided in `docs/finops-report.md` — same account as hosting, no third credential, $0 at this project's scale. |
| Who can add a photo | Whoever creates the pebble — the public submitter (`submitPebbleAction`) or an admin (`addPebbleAction`) — at creation time only | Matches the existing model where a public submission is one-shot (no post-submission editing exists for anything else on a `Pebble` either). Simpler than a separate "upload later" flow, and covers the realistic case: someone photographs the stone right when they place it. |
| Who can remove a photo | Admin only (`requireAdmin()`), any time | Matches `docs/features.md`'s explicit acceptance criterion ("authorization rules are enforced for who can add/remove photos") and the existing pattern — admins are the only ones with any post-creation edit rights on a pebble (move, verify). |
| Replacing an existing photo | Not built — deferred, see below | Remove-then-the-original-submitter-can't-re-add covers "it's wrong, take it down"; "swap it for a better one" needs its own small action and isn't in the acceptance criteria. Noted so a future session doesn't assume it was considered and rejected. |
| Server-side processing | Re-encode to WebP, resize to a max 2000px longest edge, quality ~80, via `sharp` (already an indirect dependency via Next.js's image optimizer — added here as an explicit direct one since this feature calls it directly, same reasoning as the `@auth/core` explicit-dependency decision in `docs/design-admin-pebbles.md`'s history) | Matches `docs/finops-report.md`'s explicit sizing assumption (~500–800 KB after validation) that the whole cost analysis was built on — storing raw phone-camera originals (5–15 MB each) would blow past that by 10–20x per photo, even though the 150-photo cap keeps the absolute numbers small either way. |
| Validation split | A pure `validatePebblePhoto(file)` function (MIME type + size, no I/O) separate from the side-effecting `uploadPebblePhoto()` (resize + upload) | The pure function is trivially unit-testable without mocking `sharp`/`@vercel/blob`; the side-effecting one only needs its *own* orchestration verified (right calls, right args), not sharp's or Blob's correctness. |
| Display: `<img>`, not `next/image` | Plain `<img>` for pebble photos specifically (the header `Logo` keeps using `next/image`, since that's a local `/public` asset, not a Blob URL) | `next/image` on a remote URL invokes Vercel's Image Optimization pipeline — a *third* billing dimension `docs/finops-report.md` never priced, on top of Blob storage/transfer. A plain `<img>` serves directly from Blob's public URL, matching exactly what the FinOps report analyzed. |
| Broken photo fallback | Client component (`PebblePhoto`) with an `onError` handler swapping to a placeholder state | `docs/features.md`'s acceptance criterion ("broken/missing media references fail gracefully in UI") — a dead blob URL (deleted out-of-band, network hiccup) shouldn't show a broken-image icon. |
| Feature flag | `NEXT_PUBLIC_FEATURE_PEBBLE_PHOTOS`, default off | The upload `<input>` needs to conditionally render inside client components (`SubmitPebbleForm`, `AdminAddPebbleForm`), same reason `NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE` is public-prefixed rather than server-only. |

## Data model

```prisma
model Pebble {
  // ...existing fields...
  photoUrl String?
}
```

Nullable — most historical pebbles won't have one, and it stays
optional going forward. No separate `Photo` table: one photo per
pebble (`docs/features.md`'s own phrasing, "Associate **a** photo"),
so a single column is simpler than a join for zero relational
benefit.

## New module: `src/lib/pebble-photos.ts`

```ts
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validatePebblePhoto(file: File): { error?: string };

// Resizes/re-encodes via sharp, uploads via @vercel/blob's put(),
// returns the public URL. Throws PhotoValidationError if
// validatePebblePhoto() would have failed — callers validate first
// for a friendly form error, but this re-checks rather than trusting
// the caller, same defense-in-depth reasoning as every mutating action
// in this codebase.
export async function uploadPebblePhoto(file: File): Promise<string>;

// Deletes from Blob storage. Safe to call with a URL that's already
// gone (del() on a missing blob doesn't error) — callers don't need
// to check existence first.
export async function deletePebblePhoto(url: string): Promise<void>;
```

## Route protection policy

Same policy as every other mutating entrypoint in this codebase
(`docs/design-access-control.md`): independently re-verified, not
trusted-because-the-UI-only-shows-it-here.

* `submitPebbleAction` — already calls `requireAllowedUser()` when the
  auth gate is on; the photo, if present, rides along with the same
  authorization the rest of the submission already gets. No new check
  needed — a photo isn't more sensitive than the lat/long it's
  attached to.
* `addPebbleAction` — already `assertAdminFeatureEnabled()` +
  `requireAdmin()`; same reasoning.
* `removePebblePhotoAction` (new) — `assertAdminFeatureEnabled()` +
  `requireAdmin()`, first line, before touching Blob or the DB.

## Flow

1. **Submit or admin-add, with a photo**: form includes an optional
   `<input type="file" name="photo">`. On submit, the action calls
   `validatePebblePhoto()` first — on failure, returns the same
   `{ status: "error", errors: {...} }` shape every other field
   already uses, so no new error-rendering path is needed in either
   form. On success, `uploadPebblePhoto()` runs, and the resulting URL
   is passed into `submitPebble()`/`createPebbleByAdmin()` alongside
   the rest of the row.
2. **Display**: `getVerifiedPebbles()` (map) and `listAllPebbles()`
   (admin) both already select/return full rows — `photoUrl` comes
   along automatically once it's a schema field; `VerifiedPebble`'s
   type just needs the field added. `Map.tsx`'s `InfoWindow` and
   `AdminPebbles`' list rows both render `<PebblePhoto>` when
   `photoUrl` is set.
3. **Remove**: admin-only button next to any pebble (pending or
   verified) that has a photo, in `AdminPebbles`. Calls
   `removePebblePhotoAction`, which deletes the Blob object and clears
   `photoUrl` in one transaction-free two-step (Blob delete, then DB
   update — if the DB update somehow failed after a successful Blob
   delete, the row would point at a now-404ing URL, which is exactly
   the case `PebblePhoto`'s graceful-fallback already handles, so this
   ordering is safe without a transaction).

## Testing approach

* `validatePebblePhoto()` — pure function, unit-tested directly, no
  mocks.
* `uploadPebblePhoto()`/`deletePebblePhoto()` — unit-tested with
  `sharp` and `@vercel/blob`'s `put`/`del` mocked, asserting *our*
  orchestration (right pathname pattern, right `contentType`,
  `access: "public"`) rather than re-testing sharp or Blob themselves.
* `submitPebbleAction`/`addPebbleAction`/`removePebblePhotoAction` —
  unit-tested with `pebble-photos.ts` mocked, matching every other
  action test in this codebase.
* `pebbles.ts` data-layer changes — unit-tested the same way as the
  existing `submitPebble`/`createPebbleByAdmin` tests, plus a new
  `removePebblePhoto` test; integration tests extended to round-trip
  `photoUrl` through real Postgres (still no real Blob calls — the
  integration tier is real-Postgres-only, matching
  `docs/design-admin-pebbles.md`'s established boundary; there's no
  existing precedent for hitting a real external cloud service from
  that tier and this doesn't create one).
* **New local-only e2e**: `e2e/pebble-photo-upload.spec.ts` under a
  new `playwright.blob.config.ts`, mirroring `playwright.map.config.ts`
  exactly — skips itself unless a real `BLOB_READ_WRITE_TOKEN` is set,
  not run in CI. Every other feature that touches a real paid external
  service (Google Maps/Geocoding) got this level of verification; Blob
  is the same category of thing and gets the same treatment.

## Deferred (tracked separately, not part of this change)

* **Replacing an existing photo** (upload a new one over an old one,
  rather than remove-then-nothing) — not in the acceptance criteria;
  noted so a future session doesn't assume it was considered and
  rejected.
* **Multiple photos per pebble / a gallery** — the feature brief is
  explicitly singular ("a photo"); out of scope unless a future
  revision changes that.
* **EXIF stripping** — phone photos often carry GPS/location metadata
  in EXIF. `sharp`'s default re-encode already drops EXIF (it doesn't
  copy metadata through by default), so this happens for free as a
  side effect of the resize step, not because of a deliberate privacy
  feature — worth knowing if a future photo-handling change ever
  swaps out the resize step and needs to preserve this behavior
  deliberately instead of by accident.
