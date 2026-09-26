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
- First publish done manually: `@gtpshax/agent-toolkit@1.0.0` is on npm
  (maintainer `gtpshax`). Local publish required 2FA (`--otp`).

## Fix after merge
- `provenance: true` in `publishConfig` made a local publish fail with
  "Automatic provenance generation not supported for provider: null".
  Provenance is automatic under trusted publishing, so it was removed
  (`c5363f8`, PR #13) and `npm pkg fix` normalized the `bin` path.

## Not done
- Streamable HTTP transport; additional tools.

## Outcome
- Trusted publisher configured; tag `v1.0.1` triggered the `Publish` workflow
  (run 36208330289, success, 23s).
- `1.0.1` published via OIDC with a signed provenance statement
  (sigstore logIndex 2963925333); `npm view ...@1.0.1 dist.attestations`
  reports `provenance.predicateType = https://slsa.dev/provenance/v1`.
- `latest` dist-tag briefly still pointed at `1.0.0`; registry propagation
  settled a few minutes later.
