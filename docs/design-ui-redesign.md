# Design: UI redesign

Status: implemented
Related feature: [UI redesign](features.md) in `docs/features.md`

## Context

Every screen so far was built to prove behavior, not to look intentional:
heading sizes are picked ad hoc per screen, native `<button>`/`<input>`
elements carry no styling at all (browser default chrome), the only color
system is scattered `zinc-*` utility classes, and there's no logo,
favicon, or header identity. The user's own assessment: "very rough."

A photo of Tim (`public/tim.jpg`) is now available and should be used
directly — a literal cropped photo as the header avatar and favicon, not
an abstract illustrated mark — per explicit direction, over any options
this doc might otherwise have proposed.

## Decisions

| Concern | Choice | Why |
|---|---|---|
| Design system | Tailwind v4 `@theme` tokens (color/type/spacing) + a small set of shared primitives (`Button`, `PageContainer`, a `.card`/list-row style), not a component library | Matches `docs/design.md`'s existing "no separate CSS architecture" call. A site this size doesn't need `shadcn`/MUI-scale machinery — a handful of reused primitives removes the actual duplication (five near-identical page-container classNames, zero-styled buttons/inputs everywhere) without adding a dependency. |
| Color palette | Warm amber/terracotta accent over a stone neutral base, replacing ad hoc `zinc-*` | Fits a memorial site's tone better than a generic default; stone/amber pairs cleanly in both light and dark mode. Subjective — open to iteration once it's visible. |
| Logo/avatar | `public/tim.jpg`, circularly cropped via CSS (`object-fit: cover` + `rounded-full`), used in the header and as the favicon | Explicit choice: a literal photo, not an illustrated mark. No image-generation tool is available in this environment, so CSS-cropping the provided photo is the only way to produce this without external tooling. |
| Feature flag | None — ship directly, no `NEXT_PUBLIC_FEATURE_UI_V2` toggle | CLAUDE.md's flag rule exists so a *live, publicly-used* server stays backwards-compatible mid-flight. This app has no real users yet (family/friends access is still behind `FEATURE_AUTH_GATE`, currently being tested locally) — there's no live behavior to protect, and this pass changes styling only, not logic (`docs/features.md`'s own acceptance criteria: "preserving existing feature flags and behaviors"). A dual-styling toggle would mean maintaining two visual systems side by side for a memorial site with no traffic to protect against — pure overhead. |
| Primitive shape | `Button` wraps a native `<button>` and keeps the same accessible role/text; inputs stay plain `<input>` with a shared `.input` utility class rather than a wrapping `TextField` component | `docs/features.md`'s acceptance criteria requires existing functional tests to stay green. Tests query by role/label text, not class names — keeping the same DOM shape (real `<button>`, real `<input>`) means the existing `getByRole("button", { name: ... })` assertions keep working untouched. A `TextField` wrapper would mean re-threading `name`/`ref`/`onChange` through every call site for no behavioral gain. |
| "Material-inspired" (original brief) | Not adopted literally — no Material elevation/ripple/motion system, just consistent tokens + primitives | `docs/features.md`'s original brief named Material as a reference point, not a hard requirement (no MUI/Material Web dependency was ever discussed or approved). A full Material implementation is a much larger, opinionated commitment (motion system, component library) than this site's actual problem — inconsistent ad hoc styling — needs solving. Flagging the deviation here rather than silently drifting from the brief. |

## Design tokens (`src/app/globals.css`)

Extends the existing `@theme inline` block (currently only
`background`/`foreground`):

* **Color** — `accent` (amber-ish, light/dark variants), `neutral` scale
  (stone, replacing ad hoc `zinc-*`), existing `background`/`foreground`
  kept as-is.
* **Type scale** — `h1`/`h2`/`h3` sizes formalized (today: home and
  admin both use `text-3xl` for h1 but arrived there independently;
  `/admin`'s h2 uses `text-2xl`, `ManageUsers`/`AdminPebbles` h3 uses
  `text-xl` — keep these exact sizes, just make them the *documented*
  scale instead of coincidence).
* **Elevation/state** — a `.card` component class for the repeated
  `rounded-lg border ... p-3` list-row treatment (7 near-identical
  instances today across `ManageUsers`/`AdminPebbles`/`PlaceLookup`),
  and `focus-visible` ring treatment for every interactive element
  (buttons, inputs, links) — there is currently no explicit focus style
  at all, which also closes part of the accessibility acceptance
  criterion.

## New shared primitives

* `PageContainer` — replaces the repeated
  `mx-auto flex w-full max-w-* flex-1 flex-col gap-* px-6 py-16`
  className (5 call sites today, only the `max-w-*` and gap actually
  vary) with `<PageContainer maxWidth="3xl" gap={8}>`.
* `Button` — `variant="primary" | "secondary" | "danger"`, wraps a
  native `<button>`. Every currently-unstyled `<button type="submit">`
  across `ManageUsers`, `AdminPebbles`, `AdminAddPebbleForm`,
  `SubmitPebbleForm`, `RequestAccessButton`, `SignOutButton`,
  `PlaceLookup` moves to this.
* `ButtonLink` — same look as `Button` on a `next/link` instead of a
  native `<button>`, for CTAs that navigate rather than submit (added
  after review: the home page's "Submit a pebble" was a plain
  underlined text link, not a real call to action).
* `Logo` — Tim's photo, circularly cropped, sized for the header;
  reused (larger) for the favicon generation step.
* `SiteHeader` — logo + link back to `/`, present on every page
  regardless of auth-gate state (added after review — see "Persistent
  header" below). `AppHeader` now wraps it, adding the signed-in-only
  content (email, admin link, sign out) via its children slot instead
  of duplicating the header markup.
* `AdminTabs` — switches `/admin` between its two sections via
  `?tab=access|pebbles` (added after review — see "Admin tabs" below).

## Screens in scope

* Home (`/`) — header/logo, hero copy on the new type scale, `Map`
  placeholder restyled to the `.card` treatment, submit CTA as a
  `ButtonLink` positioned directly under the intro copy.
* Submit (`/submit`) — `SubmitPebbleForm` inputs/buttons, `PlaceLookup`
  box.
* Auth-gated states — `AppHeader`/`SiteHeader`, `RequestAccess`,
  `RequestAccessButton`, `SignOutButton`.
* Admin (`/admin`) — `ManageUsers`, `AdminPebbles`, `AdminAddPebbleForm`,
  now tabbed via `AdminTabs` rather than one continuously scrolling page.

Out of scope: `Map.tsx`'s actual Google-rendered map surface (Google's
own UI, not ours to restyle) — only the placeholder/card frame around it.

## Additions made after initial review

Three requirements arrived after the first implementation pass (direct
user feedback while reviewing the in-progress result), each handled as
a small addendum rather than a full doc rewrite:

* **Persistent header** — the original plan only put a header
  (`AppHeader`) inside `AuthGate`'s signed-in branch, so with
  `FEATURE_AUTH_GATE` off (the default) or on `RequestAccess`'s screen,
  there was no header/logo at all. `SiteHeader` now renders in every
  `AuthGate` branch — see the primitives list above.
* **Admin tabs** — `/admin` was one long page with both sections
  stacked vertically. Switched to `AdminTabs` + `?tab=` search param
  (plain links to a real URL per section, not a JS-driven ARIA tabs
  widget — see the route/component itself for why that distinction
  matters for accessibility correctness).
* **Submit CTA** — "Submit a pebble" was a plain underlined text link
  at the bottom of the home page, after the map. Moved to a `ButtonLink`
  directly under the intro copy, above the map.

## Bug found and fixed along the way

Wiring up `SiteHeader`'s logo surfaced a real, pre-existing bug in
`proxy.ts`: its auth-gate matcher never exempted `public/` static
assets, so an unauthenticated request for `/tim.jpg` itself redirected
to sign-in — and so did Next's Image Optimization endpoint's *internal*
fetch of it, breaking the logo everywhere once `FEATURE_AUTH_GATE` is
on. Fixed by excluding common static image extensions in the matcher
pattern alongside the existing `api/auth`/`_next/static`/`_next/image`/
`favicon.ico` exclusions.

Diagnosing that also caught a second, self-inflicted bug: an
intermediate fix extracted the matcher pattern into a named exported
constant for reuse in a test, which broke matching entirely — Next.js
requires `config.matcher` to be a static string literal it can parse at
build time, not a reference to another variable. The production build
failed outright on this, but Turbopack's dev server didn't: it silently
ran the proxy for *every* request instead of honoring any exclusion
(confirmed via temporary debug logging — even `api/auth/signin` and
`_next/static` paths were being intercepted). The pattern is back to
being inlined directly in `proxy.ts`; `proxy.test.ts` keeps its own
literal copy of the pattern for its regression tests, since it can't
import a shared constant either, for the same reason.

## Accessibility baseline

* Visible `focus-visible` ring on every button, input, and link — none
  exists today beyond whatever the browser supplies by default.
* Manual contrast check (WCAG AA, 4.5:1 body text) for the new
  amber/stone palette in both light and dark mode before merging.
* Heading/landmark structure — already corrected for `/admin` in a
  prior PR; verify the other screens have a single `h1` each.

## Testing approach

Existing component tests assert on role/label/text, not class names —
kept that way deliberately (see the primitive-shape decision above), so
this pass shouldn't need rewrites, only re-runs to confirm. New tests
where a new interactive behavior is introduced (e.g., `Button`'s variant
prop mapping to the right classes) get a small dedicated test file
rather than duplicating coverage into every screen that uses it.

## Deferred (tracked separately, not part of this change)

* **Illustrated/brand-mark logo** beyond the literal photo — no
  image-generation tool is available here; if wanted later, needs an
  external design tool or a provided asset, same constraint noted in
  `docs/features.md` for the original photo-attachment feature.
* **Full dark-mode palette polish** beyond carrying forward existing
  `dark:` variants onto the new tokens — deeper dark-theme-specific
  design work stays a future pass if the light-mode result needs a
  dedicated dark counterpart beyond mechanical translation.
