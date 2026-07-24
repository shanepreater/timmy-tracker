# Required system features
This is the shopping list of features for the system which have yet to be delivered. 

## Features work process
1. Pick the feature design and implement it. 
2. Mark the feature as completed (ticked) in this document.
3. Check for previously completed (ticked) items and remove them.

That way this document contains the outstanding features as well as the last ones closed. If you require historical details of past features then git history is your friend.

## Features

### [] CICD pipeline
The system neats a robust CICD pipeline in order to ensure quality and also to eventually auto deploy to the end stack.

Delivered so far in `.github/workflows/ci.yml`: ESLint, shellcheck
(`scripts/*.sh`), actionlint (the workflow files themselves), a Vitest
suite, a production build, and a gitleaks secrets scan across the full
git history on every push/PR (fails the build on a hit). Still
outstanding before this can be ticked: automated deploy-on-merge to
Vercel.

### [] Base Framework
The system needs to have the website framework established (probably next.js) and also the google map integration done.

Design: [docs/design.md](design.md). Next.js/TypeScript app, Prisma/Postgres,
and a flagged Google Maps component are scaffolded; still outstanding before
this can be ticked: a real Maps API key wired up + deployed, and the
Auth.js/Google admin SSO from the MVP feature below.

### [] MVP
In order to be initially useful the system needs to provide the following:
* Intro section about Timmy and the website's intent. ✅
* Map of the world embedded into the app — ✅ scaffolded and working
  (verified end-to-end with a real API key + Playwright), stays behind
  `NEXT_PUBLIC_FEATURE_MAP` until deployed. Clicking a pebble marker
  shows who deposited it and when.
* Series of pebble locations which is retrieved from some kind of store —
  ✅ `getVerifiedPebbles()` (Prisma/Postgres) renders real markers once
  the map flag above is on.
* Submit a pebble — ✅ `/submit` form (lat/long, deposited by, date),
  behind `NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE`. Always lands as `PENDING`;
  doesn't show up on the map until an admin verifies it. Also supports
  looking up a place name to fill in the coordinates (Geocoding API,
  same key as the map) — submitters don't need to know exact lat/long.
* Simple admin section (behind SSO log in)
  * Add a pebble location using lat / long
  * Add a pebble using location name to resolve to lat / long — the
    lookup piece already exists (`PlaceLookup` in `SubmitPebbleForm`)
    and can be reused here once the admin UI itself is built
  * Move a pebble
  * Accept / verify submitted pebble

Note: `prisma/seed.ts` currently has a *template* dataset (real-world
landmarks, placeholder names) standing in for Tim's actual pebbles —
swap in the real place/who/when once it's supplied, following the same
shape.

#### Pebble
Each pebble has the following associated data:
* Lat / Long (location)
* Deposited by (text field)
* Deposited date

### CICD deployment
The system needs to auto deploy on merge to main using the CICD Pipeline.

### Fly-by mode
Use the dates to trace a fly-by across the map highlighting the places in chronological order.

### What Three words
Allow the user to provide the pebble location using the popular What three words approach.

### Associate a photo with a location
We need to allow the user to upload a picture to associate with the location of the Pebble.

### User access restrictions
Restrict access to the app to a known group of users. This should be administered by admin users and use the google account name for the allowed users.

### Design the UI better
Update the look and feel of the app so it is not just boring HTML. Use material design as a base but do something interesting and cool with the site.
