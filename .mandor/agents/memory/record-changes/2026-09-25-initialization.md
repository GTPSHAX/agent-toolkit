# 2026-09-25 — Project initialization

## Scope
Initial scaffold of the `agent-toolkit` package from a greenfield repo.

## What changed
- `package.json`: ESM (`type: module`), `bin.agent-toolkit`, `exports` map,
  scripts (`build`, `test`, `lint`, `fix`, `clean`, `prepublishOnly`).
- Added `tsconfig.build.json`; rewrote `tsconfig.json` (`types: ["node"]`,
  `noEmit`, includes `src` + `tests`).
- Scaffolded `src/`:
  - `types/{common,config,tools,index}.d.ts`
  - `core/{config,logger,errors}.ts`
  - `tools/{registry,executor,index}.ts` (built-in `echo` tool)
  - `utils/{text,index}.ts`
  - `index.ts` (library entry), `cli.ts` (CLI entry)
- `scripts/copy-types.mjs`: copies hand-written `.d.ts` into `dist/types`.
- Toolchain: `eslint.config.mjs` (extends `gts`), `.prettierrc.cjs`,
  `tests/*.test.ts` (vitest).

## Facts learned
- `tsc` does not copy hand-written `.d.ts` sources into `dist/`.
- `typescript-eslint` (used by `gts`) accepts `typescript >=4.8.4 <6.1.0`;
  TypeScript is pinned to `^6.0.3`.
- In an ESM package the Prettier config uses the `.cjs` extension; `gts`
  publishes its shared Prettier config as CommonJS.

## Verification (all passing)
- `npm run build` → exit 0, `dist/` mirrors `src/` incl. `dist/types/*.d.ts`.
- `npm test` → 15 tests pass.
- `npm run lint` → clean.
- `node dist/cli.js -h` / `list` / `run echo '{"a":1}'` → exit 0.

## Git
- Branch `main` created with commit `chore: scaffold agent-toolkit package`.
- `.opencode/` left untracked.

## Not done
- `docs/` and `examples/` still empty.
- Additional tools beyond `echo` not implemented.
