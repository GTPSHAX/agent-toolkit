# 2026-09-26 — Add web.request, regex, and json.query tools

## Scope
Three new tools chosen to cut shell round-trips: a generic HTTP client, a
regex workbench, and a JSON path selector. Each landed on its own branch from
`main`: `feat/web-request`, `feat/regex-tool`, `feat/json-query-tool`.

## What changed
- `src/utils/web-request.ts` (new): `requestUrl` with method, headers, body,
  redirect, and timeout control. Parses `application/json` bodies into `json`,
  otherwise `text`; reports status, headers, bytes; caches bodyless GET/HEAD;
  never throws on non-2xx. Constants: `REQUEST_METHODS`,
  `DEFAULT_REQUEST_MAX_LENGTH`.
- `src/tools/web.ts`: `web.request`.
- `src/utils/regex.ts` (new): `applyRegex` with `match`, `replace`, and `split`.
  `g` is always applied; invalid patterns/flags return an `error`. Constants:
  `SUPPORTED_FLAGS`, `DEFAULT_REGEX_MAX_LENGTH`.
- `src/tools/regex.ts` (new): `regex`.
- `src/utils/json-query.ts` (new): `queryJson`, `parsePath`. jq-like path:
  dot keys, `[n]` (negative indexes allowed), `[]` array iteration, `*` object
  wildcard. Each match carries a canonical path.
- `src/tools/json-query.ts` (new): `json.query`.
- Types: `RequestMethod`/`RequestOptions`/`RequestResult` (web),
  `RegexMode`/`RegexMatch`/`RegexResult` (regex),
  `JsonQueryMatch`/`JsonQueryResult` (json); new `src/types/regex.d.ts`.
- Exports updated in `utils/index.ts`, `tools/index.ts`, `types/index.d.ts`,
  `src/index.ts`; all three registered in `defaultTools` (23 tools).
- Tests: `tests/web-request.test.ts`, `tests/regex.test.ts`,
  `tests/json-query.test.ts` (fetch-mock, no network).
- `README.md`: tools table rows for all three.

## Tool contracts
- `web.request`: `url`, `method`, `headers`, `body`, `maxLength`, `redirect`,
  `noCache`.
- `regex`: `pattern`, `input`, `mode` (`match` | `replace` | `split`), `flags`,
  `replacement`, `limit`.
- `json.query`: `json`, `query`.

## Verification
- `npm test` → 160 tests pass (16 files).
- `npm run lint` → clean; `npm run build` → exit 0.
- Live: `web.request` GET GitHub API (parsed JSON), POST to httpbin (echoed
  body), 404 reports `ok: false`; `regex` named groups, `$2.$1` replace, split,
  and bad-pattern error; `json.query` on nested documents incl. `[]`, `[-1]`,
  `*`, and malformed-path error.

## Not done
- Branches not merged into `main` (user owns merges). PRs #17, #18, #19 open.
