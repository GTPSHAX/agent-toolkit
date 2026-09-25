# 2026-09-25 — Add CLI tool describe

## Scope
Expose tool parameters and example payloads from the CLI, on branch
`feat/cli-tool-describe` (base `main`).

## What changed
- `src/utils/tool-spec.ts`: `formatToolSpec`, `exampleFromSchema`.
- `src/cli.ts`: new `describe <tool>` command; `list [tool]`, `help [tool]`, and
  `-h/--help [tool]` now accept a tool name; updated `HELP_TEXT` with examples.
- `tests/tool-spec.test.ts`: 7 tests.

## CLI contract
- `list` lists tools; `list <tool>` prints the tool spec.
- `describe <tool>` prints the tool spec.
- `help` and `help <tool>` print global help or the tool spec.
- `-h` prints global help; `-h <tool>` and `--help <tool>` print the tool spec.
- Unknown tool exits with code 2.

## Output of a tool spec
- Tool name and title, description.
- Parameters with type, required/optional marker, enum choices, description.
- Example arguments and an example `run` command.
- Output schema.

## Verification
- `npm test` → 126 tests pass.
- `npm run lint` → clean.
- `npm run build` → exit 0.
- `node dist/cli.js describe uuid`, `list uuid`, `help hash`, `-h morse`,
  `--help hash` all print the expected spec; unknown tool exits 2.

## Not done
- Branch not merged into `main` (user owns merges).
