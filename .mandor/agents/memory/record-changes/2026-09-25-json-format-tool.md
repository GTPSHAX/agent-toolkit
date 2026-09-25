# 2026-09-25 — Add json.format tool

## Scope
Second built-in tool, on branch `feat/json-format-tool` (base `main`).

## What changed
- `src/types/json.d.ts`: `JsonFormatOptions`.
- `src/utils/json.ts`: `formatJson`, `DEFAULT_INDENT`, `MAX_INDENT`,
  `JsonFormatResult`.
- `src/tools/json-format.ts`: `jsonFormatTool` (`json.format`), input/output
  schema, handler.
- Registered in `src/tools/index.ts`, `src/utils/index.ts`, `src/index.ts`
  (`defaultTools`), `src/types/index.d.ts`.
- `tests/json-format.test.ts`: 9 tests.
- Added `.gitattributes` (`* text=auto eol=lf`).

## Tool contract
- Input: `{ json: string, indent?: number, sortKeys?: boolean }`.
- Output `structuredContent`: `{ text, indent, sortKeys }`.
- Rules: default indent 2; indent clamped to 0..10; indent 0 compacts;
  `sortKeys` sorts object keys recursively and preserves array order; invalid
  JSON returns `isError: true` with the parser message.

## Verification
- `npm test` → 34 tests pass.
- `npm run lint` → clean.
- `npm run build` → exit 0.
- CLI `list` shows three tools; `run json.format` pretty/invalid behave as
  specified.

## Environment finding
- With `core.autocrlf=true` and no `.gitattributes`, checkouts produced CRLF
  while the index held LF, so Prettier failed on every previously committed
  file. `.gitattributes` with `eol=lf` plus `git add --renormalize` fixed it.

## Not done
- Branch not merged into `main` (user owns merges).
