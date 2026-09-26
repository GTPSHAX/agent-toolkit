# 2026-09-26 — Add file, time, csv, semver, path tools and web.fetch format

## Scope
Second tool batch: file hashing/encoding by path, time arithmetic, CSV,
semver, cross-platform paths, and a raw-HTML mode for `web.fetch`. Each landed
on its own branch from `main`.

## What changed
- `hash.file`, `base64.file`, `hex.file` (branch `feat/file-tools`, PR #21):
  `src/types/file.d.ts`, `src/utils/file.ts`, `src/tools/file.ts`. Digest or
  encode by path without loading bytes into context; decode writes an output
  file and refuses to overwrite unless `overwrite: true`.
- `time` (branch `feat/time-tool`, PR #22): `src/types/time.d.ts`,
  `src/utils/time.ts`, `src/tools/time.ts`. Actions `now parse format add
  diff`; ISO/epoch parsing, token formatting with IANA zones via `Intl`
  (default UTC), compact/ISO/numeric durations, signed spans with ISO and
  human forms.
- `csv` (branch `feat/csv-tool`, PR #23): `src/types/csv.d.ts`,
  `src/utils/csv.ts`, `src/tools/csv.ts`. Parse handles quotes, escaped
  quotes, embedded newlines, header repair; stringify quotes structural
  characters and accepts explicit columns.
- `semver` (branch `feat/semver-tool`, PR #24): `src/types/semver.d.ts`,
  `src/utils/semver.ts`, `src/tools/semver.ts`. Parse, precedence compare,
  npm-style ranges (`^ ~` wildcards, hyphens, `||` unions expanded to
  comparators), and bumps with `.0`-started pre-releases.
- `path` (branch `feat/path-tool`, PR #25): `src/types/path.d.ts`,
  `src/utils/path.ts`, `src/tools/path.ts`. Nine actions for POSIX/Windows
  flavors over `node:path`, defaulting to the host.
- `web.fetch format` (branch `feat/web-fetch-format`, PR #26):
  `PageContent.html`, `FetchFormat`, `selectFetchBody`, `isFetchFormat`.
  Single pages return `markdown` (default), `text`, or raw `html`; crawls stay
  Markdown; PDFs report no HTML.
- All tools registered in `defaultTools`; README tools table updated per tool.

## Verification
- Per-branch `npm test`, `npm run lint`, and `npm run build` all green, each
  with live checks (temp-file digests, zone arithmetic, CSV round-trip, range
  expansion, win32/posix paths, and all three fetch formats).

## Not done
- Branches not merged into `main` (user owns merges). PRs #21-#26 open at the
  time of writing.
