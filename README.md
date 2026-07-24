# Timmy Tracker

A website, integrated with Google Maps, to track where Tim's memorial
stones have been placed by the people who loved him.

## Stack

* [Next.js](https://nextjs.org) (App Router, TypeScript)
* [Prisma](https://www.prisma.io) + Postgres
* [Auth.js](https://authjs.dev) (Google SSO) for the admin area
* Google Maps JavaScript API

See [docs/design.md](docs/design.md) for the full architecture rationale
and [docs/features.md](docs/features.md) for what's built vs. outstanding.

## Getting started

```bash
./scripts/setup.sh   # installs the right Node version and dependencies
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the values described
there before running the app.

## Development

```bash
npm run lint     # ESLint
npm test         # Vitest
npm run build    # Production build
```

CI also lints `scripts/*.sh` with [shellcheck](https://www.shellcheck.net/)
and the workflow files under `.github/workflows/` with
[actionlint](https://github.com/rhysd/actionlint), and scans every push
and PR for committed secrets with [gitleaks](https://github.com/gitleaks/gitleaks)
— a detected secret fails the build. Run the same checks locally
(macOS/Homebrew — all three tools are also available via most Linux
package managers and `scoop`/`choco` on Windows):

```bash
brew install shellcheck actionlint gitleaks
shellcheck scripts/*.sh
actionlint
gitleaks detect --source .
```

## Documentation

See [docs/README.md](docs/README.md) for an index of project
documentation.
