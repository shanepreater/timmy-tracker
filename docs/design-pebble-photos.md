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

## Amendment (2026-08-09): client-side direct upload

**Status: implemented.** First real production testers hit a hard
failure submitting a pebble with a photo attached — the form errored
out and lost all entered data. Vercel's runtime logs showed:

```
Error: Body exceeded 1 MB limit.
To configure the body size limit for Server Actions, see:
https://nextjs.org/docs/app/api-reference/next-config-js/serverActions#bodySizeLimit
statusCode: 413
```

The original design above routed the photo `File` straight through
the Server Action's `FormData` body. That works locally (`next dev`
has no such cap) but not in production: **Vercel Functions hard-cap
request bodies at 4.5 MB, and this is not configurable** — raising
Next's own `serverActions.bodySizeLimit` doesn't help, since Vercel's
platform-level limit sits below it regardless. Our own `MAX_UPLOAD_BYTES`
(8 MB) was already inconsistent with that hard ceiling even before
accounting for multipart overhead.

### The fix

Photo bytes now go straight from the browser to Vercel Blob, bypassing
the Server Action (and therefore the Function body limit) entirely —
Vercel's documented pattern for exactly this situation
([Client Uploads with Vercel Blob](https://vercel.com/docs/vercel-blob/client-upload)).

| Concern | Choice | Why |
|---|---|---|
| When the raw upload happens | As soon as the photo is selected (`PebblePhotoField`'s file `onChange`), not on form submit | Lets the rest of the form stay a normal `<form action={formAction}>` — the already-uploaded raw URL just rides along as a hidden field by the time Submit is clicked, instead of needing a custom async submit handler. Trade-off: an abandoned form (photo picked, never submitted) leaves an orphaned raw upload — tracked as its own admin cleanup entry in `docs/features.md`, paired with the "delete a pebble" admin feature rather than solved here. |
| Who authorizes the raw upload | Two upload-token routes (`/api/pebble-photo/upload-token/submit`, `/api/pebble-photo/upload-token/admin`), each re-implementing the exact authorization the corresponding Server Action already applied (submit: `requireAllowedUser()` only while `FEATURE_AUTH_GATE` is on; admin: `requireAdmin()`, always) | Same "route protection policy" as everywhere else in this codebase — the upload itself is a real authorization boundary (anyone who can reach the token route can write to Blob), so it gets the identical policy as the action it feeds, not a looser one. Two routes rather than one shared, parameterized-by-client-input route, specifically so the client can never talk its way into the more permissive (public-when-gate-off) submit policy while claiming to be the admin flow. |
| Size/type enforcement | Vercel Blob's own `allowedContentTypes`/`maximumSizeInBytes` client-token constraints (server-authoritative, enforced during the direct browser→Blob transfer) | Replaces the old `validatePebblePhoto()` server check, which no longer has anything to check — the `File` never reaches our server code at all now. Constants moved to a new client-safe module (`pebble-photo-constraints.ts`, no `sharp`/`@vercel/blob` imports) so the same 8 MB/type limits also drive instant client-side feedback on selection, before any network call. |
| Raw upload access level | Always `private` | The raw upload is a transient intermediate, never shown to end users and always fetched server-side by our own trusted code — no reason it needs to work against a public-only store, so it skips the public→private fallback dance the *final* image's `put()` still does. |
| Processing | Unchanged: `sharp` resize to 2000px/webp@80 quality, `put()` with public→private fallback | The bytes just come from fetching the raw Blob URL server-side now (`get()`, same public→private fallback pattern already proven in `/api/pebble-photo/route.ts`) instead of `File.arrayBuffer()`. Every sizing/format/storage assumption in `docs/finops-report.md` still holds — this only changes how bytes get from the browser to the code that was always going to resize them. |
| Raw upload cleanup | Best-effort `del()` of the raw blob immediately after the processed version uploads successfully | Keeps the common case (photo selected, form submitted) from leaving any trace of the raw intermediate. Doesn't handle the abandoned-form case — see the admin cleanup follow-up above. |

### Updated module interface (`src/lib/pebble-photos.ts`)

```ts
// Fetches the raw upload by URL, resizes/re-encodes via sharp, uploads
// the processed result, and best-effort deletes the raw intermediate.
// Throws PhotoValidationError if the raw upload can't be found or
// sharp can't process it.
export async function processUploadedPebblePhoto(rawUrl: string): Promise<string>;

export async function deletePebblePhoto(url: string): Promise<void>; // unchanged
```

`validatePebblePhoto(file: File)` and `uploadPebblePhoto(file: File)`
are gone — no code path ever holds a `File` server-side anymore.
Equivalent pure validation now lives in `src/lib/pebble-photo-constraints.ts`
(`validatePhotoFile`), used client-side by `PebblePhotoField`.

New client-side pieces:

* `src/lib/pebble-photo-client-upload.ts` — thin wrapper around
  `@vercel/blob/client`'s `upload()`, picks the right token route by
  context (`"submit" | "admin"`).
* `src/components/PebblePhotoField.tsx` — shared by `SubmitPebbleForm`
  and `AdminAddPebbleForm` (previously each had its own inline
  `<input type="file">`): validates on selection, uploads immediately,
  shows upload/error state, and renders the hidden `rawPhotoUrl` field
  the action reads.
* `src/lib/pebble-photo-upload-token.ts` — shared `handleUpload()`
  plumbing behind both token routes; each route supplies its own
  `authorize()` callback.

### Testing approach (amendment)

* `validatePhotoFile()` — pure function, unit-tested directly (moved
  from `pebble-photos.test.ts`, same cases).
* `processUploadedPebblePhoto()` — unit-tested with `get`/`put`/`del`
  and `sharp` mocked: fetch fallback (public→private), processing
  failure, upload fallback (public→private, unchanged from before),
  and that a raw-delete failure doesn't fail the whole call.
* `pebble-photo-upload-token.ts` and both route handlers — unit-tested
  with `@vercel/blob/client`'s `handleUpload` mocked to invoke the
  supplied `onBeforeGenerateToken`, asserting each route's
  authorization policy matches its Server Action exactly (including
  the 403s when the relevant feature flags are off).
* `PebblePhotoField` — component-tested directly (selection→upload→
  hidden-field-population happy path, client-side validation
  rejection, upload failure), plus one integration assertion in each
  of `SubmitPebbleForm`/`AdminAddPebbleForm`'s own tests that Submit
  stays disabled while a photo upload is in flight.
* `submitPebbleAction`/`addPebbleAction` — same shape as before, just
  asserting against `processUploadedPebblePhoto(rawPhotoUrl)` instead
  of `uploadPebblePhoto(file)`.
* `e2e/pebble-photo-upload.spec.ts` (local-only, real Blob) — updated
  to wait for the "Uploading photo…" indicator to clear before
  clicking Submit, since the upload is no longer synchronous with
  submission.

## Amendment (2026-08-10): orphaned raw-upload cleanup

**Status: implemented.** The direct-client-upload amendment above
explicitly traded a form-submission race for a new problem, flagged at
the time in `docs/features.md`: uploading the raw photo on *selection*
rather than on *submit* means an abandoned form (tab closed, a
different photo picked instead) leaves the raw upload in Blob
permanently — nothing else in the app ever processes or deletes it.
This closes that out with an admin-facing cleanup view.

| Concern | Choice | Why |
|---|---|---|
| Finding orphans | `list({ prefix: "pebbles-raw/" })`, filtered to uploads older than 1h | The `pebbles-raw/` prefix already cleanly separates raw uploads from processed photos (`pebbles/`). The 1h floor exists so a submission genuinely still in progress — photo picked, admin still typing the rest of the form — never gets listed as though it were abandoned; generous headroom over how long a five-field form actually takes to fill in. (Originally 24h — live-tested immediately after shipping and found to make the feature look broken for a full day after every real upload.) |
| Pagination | None — single `list()` call (default limit 1000) | This project's scale (150 pebbles total, `README.md`'s "Assumptions") means orphan counts will never approach four figures; added complexity with no realistic payoff. |
| Deletion | Delete one, or delete all listed orphans, both admin-only and confirmed client-side (`ConfirmForm`, shared with the "Delete a pebble" amendment in `docs/design-admin-pebbles.md`) | Matches "delete a pebble"'s reasoning exactly — this is also an irreversible Blob delete. |
| Where it lives | A third `AdminTabs` entry, "Orphaned photos" (shown only when the `pebblePhotos` flag is on — DB-backed as of the "Dynamic feature flags" amendment in `docs/design.md`, not the env var this table originally said) | Started as a section stacked under "Manage pebbles"; moved to its own tab after live-testing feedback that raw-upload cleanup reads as unrelated to pebble management proper, not a sub-part of it. |

New module: `src/lib/pebble-photo-orphans.ts` —
`listOrphanedPhotoUploads()`, `deleteOrphanedPhotoUpload(url)`,
`deleteAllOrphanedPhotoUploads()`. New actions in
`src/app/admin/actions.ts`: `deleteOrphanedPhotoUploadAction`,
`deleteAllOrphanedPhotoUploadsAction` — both
`assertAdminFeatureEnabled()` + `requireAdmin()` +
`assertPebblePhotosEnabled()` (a new shared helper; `removePebblePhotoAction`
was refactored to use it too, replacing its identical inline check).

## Amendment (2026-08-10): multiple photos per pebble

**Status: implemented.** Live-testing feedback asked for more than one
photo per pebble. This deliberately supersedes the "Deferred" note
below with a narrower design than the "Multiple photos per pebble"
entry in `docs/features.md` originally sketched — that brief assumed
`photoUrl` itself would get migrated into a join table (`photoUrl`
becomes "the main photo"). The actual instruction this session was to
keep the primary photo exactly as-is and add additional photos purely
on top of it, so that's what shipped: **no `photoUrl` migration, no
change to any existing pebble's data.**

| Concern | Choice | Why |
|---|---|---|
| Data model | New `PebbleAdditionalPhoto` table (`pebbleId` FK `onDelete: Cascade`, `url`, explicit `position Int`) — `Pebble.photoUrl` unchanged | `position` is explicit rather than inferred from `createdAt` because rows created together in one batch insert can share an identical `createdAt` (Postgres's `now()` is transaction-start time, not statement time) — ties are real for exactly the batch-insert case this feature needs. |
| Creation-time inserts | Prisma nested write (`prisma.pebble.create({ data: { ..., additionalPhotos: { create: [...] } } })`) | Atomic in one call, no `$transaction` needed — this codebase has never used `$transaction`, and Prisma's nested-write API already gives atomicity here for free. |
| Max additional photos | New `AppSetting` key `MAX_ADDITIONAL_PEBBLE_PHOTOS`, default 5, admin-configurable on the Settings tab (`ManageMaxAdditionalPhotos`) | Same reasoning as `ORPHANED_IMAGE_DELAY_MINS` — a judgment call for whoever's running the site, not a constant worth hardcoding. |
| Where additional photos can be added | Both at creation time (`SubmitPebbleForm`/`AdminAddPebbleForm`, symmetric with the existing primary-photo field) **and** later, admin-only, to an already-existing pebble (`AdminAdditionalPhotos` in `AdminPebbles`) | Explicit scope decision this session — the original single-photo feature only ever allowed a photo at creation time; additional photos deliberately go further so an admin isn't stuck if more photos of a stone surface later. |
| Client upload UI | New `AdditionalPebblePhotosField`, a multi-file sibling of `PebblePhotoField` — same upload-on-select pattern, extended to N files, accumulating slots across repeated selections (a native `<input multiple>` replaces its FileList on each pick rather than appending) | Reuses the entire existing per-file pipeline (`uploadRawPebblePhoto`, both upload-token routes, `validatePhotoFile`) unchanged — every additional photo is just another independent call into that same machinery. |
| Partial-batch failure | New `processUploadedPebblePhotos(rawUrls)` in `pebble-photos.ts`: processes concurrently via `Promise.allSettled`; if any fail, best-effort deletes the *processed* blobs that already succeeded in the same batch before rethrowing | Multi-photo is the first place a mid-batch partial failure can happen (previously only ever one photo per pebble). Without this cleanup, a failed submission would leak permanently-orphaned processed images — the existing orphan-cleanup admin feature only scans the raw-upload prefix, never the processed one. |
| Over-cap submissions | Rejected with a typed form error at creation time (`errors.photo`); thrown directly for the admin-only "add more later" action (matching `updateOrphanMinAgeMinutesAction`'s plain-throw precedent) | Not silently truncated — a user who picked N photos should get told if N exceeds the cap, not have some silently dropped. |
| Removing an additional photo | Admin-only, `getAdditionalPhotoUrl` → `deletePebblePhoto` → `deleteAdditionalPhotoRow`, same Blob-then-DB order as `removePebblePhotoAction` | A DB-delete failure after a successful Blob delete just leaves a dangling reference `PebblePhoto`'s existing fallback already handles gracefully; the reverse order risks a permanently orphaned Blob object. |
| Display | New `PebblePhotoCarousel`: primary photo first, then additional ones, auto-advancing every 3s and looping, with next/prev buttons and a page counter. Passes through to a plain `PebblePhoto` (no chrome) for 0 or 1 photos. Manual nav resets the auto-advance timer imperatively via a ref, not an effect keyed on the current index (ticking would otherwise tear down and recreate the interval every 3s for nothing) | Used only in `Map.tsx`'s `InfoWindow` (the pin-click popup). The small circular marker thumbnail on the pin itself is **unchanged** — primary photo only, no carousel there. |
| Feature flag | Reuses the existing `pebblePhotos` dynamic flag — no new dedicated flag | Additional photos are strictly additive to the same feature, not separately toggleable. |

New module: `src/lib/pebble-additional-photos.ts` — bundles the max-count
`AppSetting` getter/setter with the `PebbleAdditionalPhoto` CRUD, same
bundling pattern as `pebble-photo-orphans.ts`.

## Deferred (tracked separately, not part of this change)

* **Replacing an existing photo** (upload a new one over an old one,
  rather than remove-then-nothing) — not in the acceptance criteria;
  noted so a future session doesn't assume it was considered and
  rejected. Applies to both the primary photo and additional ones.
* **Reordering additional photos** after creation — position is
  insertion order only, no drag-reorder UI.
* **`maxAdditionalPhotos` on the public `GET /api/config` endpoint** —
  nothing needs a client-side fetch-on-mount for it; it's always
  available server-side exactly where it's rendered (`submit/page.tsx`,
  `admin/page.tsx`).
* **EXIF stripping** — phone photos often carry GPS/location metadata
  in EXIF. `sharp`'s default re-encode already drops EXIF (it doesn't
  copy metadata through by default), so this happens for free as a
  side effect of the resize step, not because of a deliberate privacy
  feature — worth knowing if a future photo-handling change ever
  swaps out the resize step and needs to preserve this behavior
  deliberately instead of by accident.
