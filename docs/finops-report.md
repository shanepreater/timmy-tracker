# FinOps report: photo storage for "Associate a photo with a location"

Status: informational — feeds the design for the
[Associate a photo with a location](features.md) backlog item. Not a
design doc itself; see that entry for acceptance criteria once design
starts.

Prepared: 2026-07-25. Pricing changes — re-verify figures below before
relying on them for a decision more than a few months old (each claim
is sourced; see [Sources](#sources)).

## TL;DR

The pebble count has a real, known ceiling: **150 pebbles have
actually been made** (confirmed by the user, not estimated), and the
feature is one photo per pebble — so this is a **hard cap of 150
photos, ever**, not an open-ended growth curve. At that scale, **any**
of the options below costs **$0/month**, including paid-tier rates,
and by a wide margin — an estimated ~75–120 MB total storage sits at
roughly 8–12% of Vercel Blob's free 1 GB Hobby allowance, with no
plausible path to exceeding it. The real decision isn't "which is
cheapest" — they're all free here — it's **which fits the existing
architecture with the least new operational surface**. That's
**Vercel Blob**: same account as hosting (no third credential to
provision or rotate, same reasoning `docs/design.md` already used to
pick Vercel Postgres over a separate DB host), billed alongside
everything else.

The only way this gets expensive is by *not* enforcing the upload
constraints the feature's own acceptance criteria already require
(server-side format/size validation, auth on who can upload) — see
[Risk: what would actually blow the budget](#risk-what-would-actually-blow-the-budget).

For the full stack, not just photos — including the now-confirmed
custom domain, the one real recurring cost in this project — see
[All-in annual hosting estimate](#all-in-annual-hosting-estimate).

## Context

`docs/design.md` chose Vercel (hosting) and Vercel Postgres/Neon
(database) explicitly to avoid a third account/credential to manage.
Photo storage is a new category of cost this project hasn't carried
before, so it gets its own look before `docs/features.md`'s
"Associate a photo with a location" item moves from backlog to design.
This report exists to answer one question before that design starts:
**does the storage backend choice have real cost implications at our
scale, and does it change any architectural assumption already made?**

The current deployment plan (`docs/design.md`) is Vercel hosting with
Vercel Postgres/Neon — as of this report, not yet actually deployed
(`docs/features.md`'s "CI/CD pipeline and deployment" item is still
open). Costs below are projected against that plan, not measured
against a live bill.

## Usage estimate

The pebble count is a known, fixed ceiling, not a projection: **150
pebbles have been physically made** — no more will ever exist, since
each one is a real stone someone placed. That caps the photo count at
150 too (one per pebble). Only the per-photo size is still an
assumption, since the upload/validation pipeline doesn't exist yet.

| Assumption | Value | Basis |
|---|---|---|
| **Total pebbles (hard cap)** | **150** | Confirmed count of physical pebbles made — not an estimate, and not open-ended: no more pebbles are being produced. |
| Photos per pebble | 1 | Matches the feature's own phrasing ("Associate **a** photo with a location") — one per pebble. |
| Photo size after validation | ~500–800 KB | Assumes the feature's acceptance criteria ("supported image formats and max size are validated server-side") land on something like a 5–10 MB upload cap plus server-side resize/re-encode to a sane display size (e.g. longest edge ~2000px, JPEG/WebP ~80% quality) before storing — not storing the raw phone-camera original, which can run 5–15 MB per photo on modern phones. |
| **Total storage, worst case** | **~120 MB** | 150 pebbles × 800 KB. Realistically lower — 150 × 500 KB ≈ 75 MB — since not every pebble will end up with a photo attached. |
| Monthly page visitors | Tens, not thousands | Family/friend audience, not public traffic — `docs/design.md`'s own framing. |
| Monthly photo views (bandwidth driver) | Low hundreds | Visitors × photos actually opened, generously estimated; capped in practice since there are only 150 photos that can ever be viewed. |
| **Monthly data transfer, realistic** | **&lt; 1 GB** | Low hundreds of views × ~500–800 KB average, before any CDN caching (which would reduce this further on repeat views). |

At ~120 MB worst-case total storage, this sits at roughly **8–12% of
Vercel Blob's free 1 GB Hobby allowance** — permanently, since the
pebble count can't grow. Every option compared below is free at this
scale by a wide margin, including Neon's tiny 0.5 GB free database
storage, though that one's excluded for the reasons below regardless.

## Storage backend options

All figures below are the providers' own published rates as of this
report's preparation date — see [Sources](#sources) for the exact
page fetched for each. "Cost at our scale" uses the worst-case ceiling
above (~120 MB storage, &lt;1 GB/month transfer) unless noted.

| Option | Storage | Egress/transfer | Free tier | Cost at our scale | Extra account? |
|---|---|---|---|---|---|
| **Vercel Blob** (recommended) | $0.023/GB-month (Pro rate; Hobby included free up to 1 GB) | $0.05/GB (Blob Data Transfer) | **1 GB storage/month free on Hobby**, no card required; limits reset monthly, no overage billing on Hobby (blocked until reset instead) | **$0** (~120 MB is ~12% of Hobby's 1 GB free allowance) | No — same Vercel account as hosting/DB |
| Cloudflare R2 | $0.015/GB-month | **$0 egress** (R2's main differentiator) | 10 GB storage, 1M Class A + 10M Class B ops/month free | **$0** (fits free tier) | Yes — new Cloudflare account, API tokens, a second dashboard to monitor |
| AWS S3 (Standard) | $0.023/GB-month (first 50 TB) | $0.09/GB (first 10 TB) | None meaningful (AWS's general free tier is 12-months-only, 5 GB) | **$0** at ~120 MB storage; ~$0.09 for &lt;1 GB/month transfer once any AWS free-tier window has expired | Yes — new AWS account, IAM setup, billing alerts strongly advised (S3 has no hard cap; a misconfigured bucket or credential leak can run up a real bill) |
| Cloudinary | Credit-based: 1 credit = 1 GB storage **or** 1 GB bandwidth **or** 1,000 transformations | Same credit pool | 25 credits/month free, flexibly split | **$0** (well under 25 credits even combining storage + bandwidth + a few transformations) | Yes — new account; strongest built-in image-transformation/optimization tooling of the options here, which this project doesn't currently need but could later (auto-format, responsive sizes) |
| Postgres `bytea` column (anti-pattern) | Neon storage rate, $0.35/GB-month (paid tier); free tier is 0.5 GB total, shared with all app data | N/A — served through the app, not a CDN | 0.5 GB total free tier, shared with the entire database | Technically "$0" at our scale, but see below | No extra account — the reason this gets considered at all |

### Why not just store photos in Postgres?

It's the only option with no new account, so it's worth naming
explicitly why it's not the recommendation despite that:

* Neon's free tier storage (0.5 GB) is shared with the *entire*
  database, not a photo-specific allowance — every pebble row, access
  request, and allowed-user record competes with photo bytes for the
  same small quota.
* Binary data in Postgres bloats every backup, every `pg_dump`, and
  every read of unrelated data that happens to scan the same table
  pages — a cost in operational friction, not dollars, but a real one.
* No CDN caching — every photo view round-trips through a Function
  and the database connection pool instead of being served directly
  from edge storage, which is both slower for visitors and burns
  Function/compute budget (billed separately, see the Vercel Hobby
  limits above) for work a blob store does for free.
* This is a well-known anti-pattern independent of this project's
  scale; the only reason to still consider it here is "zero new
  accounts," and Vercel Blob gets that same benefit without the
  downsides above.

## Recommendation

**Vercel Blob**, matching `docs/design.md`'s existing reasoning for
Vercel Postgres ("Vercel's native... integration avoids a third
account"). Given the fixed 150-pebble ceiling, this costs $0/month on
the Hobby plan's free allowance permanently, with headroom to spare
(1 GB free vs. an estimated 75–120 MB worst-case need, ~8–9x
overhead). If the project ever moves to Vercel Pro for unrelated
reasons (e.g. the "CI/CD pipeline and deployment" item needing Pro
features), Blob's paid rate is still negligible at this scale: 120 MB
storage ≈ $0.003/month, and under 1 GB/month transfer ≈ $0.05/month.

Cloudflare R2's $0 egress is the more compelling choice for a
photo-heavy, high-traffic product — not a factor here given the
estimated &lt;1 GB/month transfer, and not worth a second cloud
account for a savings measured in fractions of a cent.

## Risk: what would actually blow the budget

Every scenario below is already something the feature's own
acceptance criteria (`docs/features.md`) require guarding against for
correctness, not just cost — cost control here is a side effect of
building the feature correctly, not a separate concern:

* **No server-side size/format validation** — "supported image formats
  and max size are validated server-side" is already an acceptance
  criterion. Without it, nothing stops a 500 MB upload (Vercel Blob's
  max is 5 TB per file) or an unbounded number of them.
* **No upload authorization** — "authorization rules are enforced for
  who can add/remove photos" is already an acceptance criterion.
  Without it, an open upload endpoint is an open invitation to store
  someone else's data on this project's bill, not just a data-integrity
  problem.
* **Serving originals instead of resized versions** — a 12 MB
  phone-camera photo displayed at 400px on a map marker wastes both
  storage and, on every view, data transfer. Resize/re-encode at
  upload time (already assumed in the usage estimate above), not at
  render time.
* **No cache-friendly delivery** — Vercel Blob's public storage mode
  serves directly from the CDN with cache hits costing nothing further;
  routing photo requests through a Function instead (private storage
  mode) pays Function compute *and* data-transfer costs on every
  request, cache or not. Use public blobs for anything that isn't
  access-controlled per-photo (this feature doesn't need per-photo
  auth beyond the existing whitelist gate on the page itself).

None of these require new tooling to prevent — they're the same
validation and auth patterns already established for every other
mutating action in this codebase (`requireAdmin()`/
`requireAllowedUser()`, `validateSubmitPebbleInput`-style server-side
checks) — just applied to a new field this feature will design when
it moves from backlog to design doc.

## All-in annual hosting estimate

Photo storage was the trigger for this report, but it's one piece of
the full stack. Rolling up every paid service this project actually
uses or is about to use, at the fixed 150-pebble / family-and-friends
traffic scale established above:

| Service | Free tier | This project's usage | Annual cost |
|---|---|---|---|
| Vercel hosting (Hobby) | 100 GB bandwidth, 1M function invocations/month; personal/non-commercial use only | Tens of visitors/month — a rounding error against 100 GB | **$0** |
| Vercel Blob (photos) | 1 GB storage/month | ~75–120 MB, permanently (150-pebble cap) | **$0** |
| Neon/Vercel Postgres | 0.5 GB storage, 100 CU-hours compute/month (Free plan) | A few hundred rows total (pebbles + users + requests) — KBs, not GB; compute scales to zero between visits | **$0**, but see the caveat below |
| Google Maps JavaScript API | 10,000 map loads/month free (per-SKU quota since March 2025, replacing the old pooled $200/month credit) | Tens of page loads/month — ~0.1–1% of the free quota | **$0** |
| Google Geocoding API | 10,000 requests/month free | Occasional place lookups on submit/add-pebble forms — negligible against the quota | **$0** |
| Custom domain (confirmed — via GoDaddy) | N/A — `*.vercel.app` is free, but a custom domain has been decided on | `.com` via GoDaddy: ~$5 first year (promo pricing varies), **~$22–23/year on renewal** | **~$22–23/year**, ongoing (renewal rate, not the discounted first-year price) |

**Total: ~$22–23/year** — the domain renewal is the only genuinely
recurring cost in this entire stack; every metered service above stays
at $0 given the fixed 150-pebble ceiling. See
[Custom domain: GoDaddy → Vercel](#custom-domain-godaddy--vercel)
below for the actual setup steps.

**Caveat worth watching**: Neon's Free plan compute (100 CU-hours/month,
scale-to-zero when idle) is the one line that depends on *access
patterns*, not just data size — a cold start after idling costs a
brief compute spike, and if the app were ever configured to ping the
database continuously (e.g. a health check hitting it every minute)
rather than only on real visits, that could burn through the free
compute allowance in a way flat storage limits can't. Not a risk at
today's usage, but worth a glance at the Neon dashboard after the
first month of real traffic once deployed.

## Custom domain: GoDaddy → Vercel

A domain has been decided on; registering it happens in a GoDaddy
account, which this codebase/agent has no access to (payment and
account actions are the user's to take) — the below is the plan to
follow, not something already done.

**Name suggestions** (check availability on GoDaddy — not verified
here, no live availability lookup was run): `timmytracker.com`,
`timmytracker.org`, `trackingtim.com`. Matches the name already used
throughout the app (page title, header text, `README.md`), so no
rebranding needed once one is registered.

**Connecting a GoDaddy-registered domain to Vercel** (do this only
once the "CI/CD pipeline and deployment" backlog item has an actual
Vercel project deployed — a domain has nothing to point at before then):

1. Buy the domain in GoDaddy as normal — don't enable GoDaddy's own
   website builder/forwarding, since Vercel will be serving the site.
2. In the Vercel dashboard: **Project → Settings → Domains → Add**,
   enter the domain (e.g. `timmytracker.com`). Vercel will prompt to
   also add the `www` subdomain — accept that, it's how visitors
   typing either form end up in the right place.
3. Vercel then displays the **exact DNS records to add** for that
   specific domain/project — an **A** record for the apex domain and a
   **CNAME** for `www`. Use whatever Vercel's dashboard shows at that
   moment rather than a value from this doc or any other source; it's
   project-specific and this doc isn't the source of truth for it.
4. In GoDaddy: **My Products → DNS → Manage DNS** for the domain, add
   those exact records (GoDaddy usually pre-populates a placeholder A
   record/parking page — replace it, don't add alongside it).
5. Wait for DNS propagation (usually minutes, can take longer) —
   Vercel's Domains page shows a pending/verified status and
   auto-issues an SSL certificate once it resolves correctly.
6. Set the redirect direction (apex → `www` or `www` → apex — either
   is fine, just pick one) in Vercel's domain settings so visitors
   always land on one canonical URL rather than the app serving
   duplicate content at both.

## Sources

- [Vercel Blob Pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing) — storage/operation/transfer rates, Hobby vs. Pro behavior, worked pricing example
- [Vercel Pricing](https://vercel.com/pricing) — Hobby/Pro plan base limits (bandwidth, blob storage, image transformations, function invocations)
- [Neon Plans](https://neon.com/docs/introduction/plans) — Free/Launch/Scale plan storage and compute pricing
- [Cloudflare R2 Pricing 2026 — EgressCost.com](https://egresscost.com/cloudflare/) — R2 storage/operations rates and free tier
- [Cloudinary Pricing Explained — The Image CDN](https://theimagecdn.com/docs/cloudinary-pricing) — credit-based free tier structure
- [AWS S3 Pricing 2026 — Filebase](https://filebase.com/blog/aws-s3-pricing-in-2026-what-youll-actually-pay/) — S3 Standard storage and data-transfer-out rates
- [Google Maps Platform Pricing](https://developers.google.com/maps/billing-and-pricing/pricing) — Maps JavaScript API and Geocoding API free quotas and per-1,000-request rates
- [Google Maps Platform pricing FAQ](https://developers.google.com/maps/billing-and-pricing/faq) — confirms the March 2025 change from a pooled $200/month credit to per-SKU free quotas
- [Vercel: Adding & Configuring a Custom Domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain) — apex A record / subdomain CNAME / nameserver setup options
- [GoDaddy .com pricing — Cybernews](https://cybernews.com/best-web-hosting/godaddy-review/pricing/) — first-year promotional vs. renewal pricing
