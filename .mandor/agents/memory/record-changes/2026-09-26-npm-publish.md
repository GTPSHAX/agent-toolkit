# 2026-09-26 — Publish to npm via trusted publishing

## Scope
Automate npm publishing from GitHub Actions, on branch `feat/npm-publish`
(base `main`).

## What changed
- `package.json`: renamed to `@gtpshax/agent-toolkit`; added `publishConfig` with
  `access: public` and `provenance: true`.
- `package-lock.json`: refreshed for the scoped name.
- `.github/workflows/publish.yml`: runs on `v*` tags (and manual dispatch);
  installs, lints, builds, tests, then `npm publish` with `id-token: write`.
- `README.md`: npm badge, install/npx commands, scoped imports, release steps.

## Facts that drove the design
- The unscoped name `agent-toolkit` is already owned on npm (maintainer
  `economos`, version 0.0.0); `toolkit-ai`, `ai-toolkit`, and `ai-agent-toolkit`
  are also taken. `@gtpshax/agent-toolkit` is available.
- npm trusted publishing (npm docs): publish with OIDC instead of an npm token;
  requires npm CLI >= 11.5.1 and Node >= 22.14.0 on a GitHub-hosted runner;
  workflow needs `id-token: write`; `package.json` `repository.url` must match
  the GitHub repository; provenance is generated automatically for public
  packages from public repositories.

## Required manual setup (user)
On npmjs.com, add a trusted publisher for `@gtpshax/agent-toolkit`:
- Provider: GitHub Actions
- Organization/user: `GTPSHAX`
- Repository: `agent-toolkit`
- Workflow filename: `publish.yml`
- Allowed action: `npm publish`

## Verification
- `npm install` synced the lockfile to `@gtpshax/agent-toolkit`.
- `npm run lint` clean; `npm run build` exit 0; `npm test` 138 tests pass.
- `npm pack --dry-run`: `@gtpshax/agent-toolkit@1.0.0`, 157 files, ~79 kB.

## Not done
- No tag pushed yet, so the workflow has not run.
- Branch not merged into `main`.
