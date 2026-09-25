# 2026-09-25 — Add text.stats tool

## Scope
First built-in tool, on branch `feat/text-stats-tool` (not merged).

## What changed
- `src/types/text.d.ts`: `TextStats` interface.
- `src/utils/text-stats.ts`: `computeTextStats`.
- `src/tools/text-stats.ts`: `textStatsTool` (`text.stats`), input/output
  schema, handler.
- Registered in `src/tools/index.ts`, `src/utils/index.ts`, `src/index.ts`
  (`defaultTools`), and `src/types/index.d.ts`.
- `tests/text-stats.test.ts`: 10 tests.

## Tool contract
- Input: `{ text: string }`.
- Output `structuredContent`: `characters`, `charactersNoSpaces`, `words`,
  `lines`, `sentences`, `uniqueWords`, `longestWord`.
- Definition rules: empty string yields zeros; `lines` is 0 for empty input;
  a trailing fragment without terminator counts as a sentence; unique words
  are case-insensitive; characters count Unicode code points.

## Verification
- `npm test` → 25 tests pass.
- `npm run lint` → clean.
- `npm run build` → exit 0.
- `node dist/cli.js run text.stats '{"text":"Hello world. Second line!"}'` →
  `isError: false`.

## Not done
- Branch not merged into `main` (user owns merges).
