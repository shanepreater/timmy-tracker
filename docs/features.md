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
* Submit a pebble 
* Simple admin section (behind SSO log in)
  * Add a pebble location using lat / long
  * Add a pebble using location name to resolve to lat / long 
  * Move a pebble
  * Accept / verify submitted pebble

#### Pebble
Each pebble has the following associated data:
* Lat / Long (location)
* Deposited by (text field)
* Deposited date

### Fly-by mode
Use the dates to trace a fly-by across the map highlighting the places in chronological order.

