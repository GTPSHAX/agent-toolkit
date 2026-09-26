# 2026-09-26 — License, CI, and Doxygen docs

## Scope
Add an MIT license, package metadata, GitHub Actions workflows, and Doxygen API
docs. Branch `chore/license-ci-docs` (merged via PR #10) plus a follow-up fix on
`fix/docs-workflow`.

## What changed
- `LICENSE`: MIT.
- `package.json`: `license` MIT, `author`, `repository`, `bugs`, `homepage`,
  `keywords`, `engines` (Node >= 18), `files`, and a `docs` script.
- `.github/workflows/ci.yml`: lint, build, and test on Node 22 and 24.
- `.github/workflows/docs.yml`: build Doxygen docs and deploy to GitHub Pages.
- `Doxyfile`, `scripts/doxygen-filter.mjs`: TypeScript is mapped to the Doxygen
  JavaScript parser through a filter that strips TypeScript-only syntax.
- `.gitignore`, `eslint.config.mjs`: ignore generated `docs/api/`.
- `README.md`: CI/Docs/License badges, a docs section, MIT license.

## Findings
- Doxygen has no TypeScript parser (doxygen/doxygen#9904); the filter plus
  `EXTENSION_MAPPING = ts=JavaScript` makes the sources parseable.
- `vitest@5` requires Node 22.12 or newer, so the CI matrix uses Node 22 and 24
  (not 18 or 20).
- GitHub Actions jobs failed with zero steps and no logs; the run page reported
  "your account is locked due to a billing issue". Resolved by the user.
- GitHub Pages is enabled with `build_type: workflow`; the site is
  `https://gtpshax.github.io/agent-toolkit/`.
- The docs build failed in CI because empty directories are not tracked, so the
  output parent did not exist. Fixed with `mkdir -p docs/api` before `doxygen`.

## Verification
- `npm run lint` clean; `npm test` 138 tests pass; `npm run build` exit 0.
- Local Doxygen 1.18.0 produced HTML (46 `.ts` files, 60+ classes, README main page).
- CI on `main`: success (28s).
- Docs workflow on the fix branch: build and artifact upload succeed; deploy is
  refused off `main` by the `github-pages` environment protection rule, as
  expected.

## Not done
- Streamable HTTP transport; additional tools.
