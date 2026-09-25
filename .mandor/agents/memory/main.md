# main.md — agent-toolkit

## Status (2026-09-25)
Project jalan. Branch `main` berisi commit awal scaffold. Tool pertama
`text.stats` dikerjakan di branch `feat/text-stats-tool` (belum di-merge).

## Stack
- Bahasa: TypeScript `^6.0.3` (strict, `module: nodenext`, `target: esnext`, ESM `"type": "module"`)
- Runtime: Node.js (dev: v22.23.2)
- Library: zero runtime dependency (hanya Node built-in)
- Dev deps: `typescript`, `tsx`, `@types/node`, `vitest@5`, `gts@7`

## Struktur aktual
- `src/index.ts` — entry library (re-export + `defaultTools()`)
- `src/cli.ts` — entry CLI (bin `agent-toolkit`), `-h`/`list`/`run`
- `src/types/*.d.ts` — tipe publik terpusat (common, config, tools, text, index)
- `src/core/` — `config.ts`, `logger.ts`, `errors.ts`
- `src/tools/` — `registry.ts`, `executor.ts` (tool `echo`), `text-stats.ts` (tool `text.stats`), `index.ts`
- `src/utils/` — `text.ts` (`parseArgv`, `truncate`, `center`, dll), `text-stats.ts` (`computeTextStats`), `index.ts`
- `tests/` — `text.test.ts`, `tools.test.ts`, `text-stats.test.ts` (vitest, 25 test)
- `scripts/copy-types.mjs` — copy `src/types` → `dist/types`
- `dist/` — output build (di-gitignore)

## Git
- Remote `origin`: https://github.com/GTPSHAX/agent-toolkit.git (private)
- `main` dan `feat/text-stats-tool` ter-push; branch fitur belum di-merge.
- Branch `feat/text-stats-tool` berisi `feat: add text.stats tool`.

## Config
- `tsconfig.json` — dev/typecheck (`noEmit: true`, include `src`+`tests`)
- `tsconfig.build.json` — build (`rootDir: src`, `outDir: dist`, declaration on)
- `eslint.config.mjs` — extends `gts`, ignores `dist/`
- `.prettierrc.cjs` — `...require('gts/.prettierrc.json')`
- `.gitignore` — `node_modules/`, `dist/`

## Perintah
- `npm run build` — `tsc -p tsconfig.build.json` + copy types
- `npm test` — `vitest run`
- `npm run lint` / `npm run fix` — `gts lint` / `gts fix`
- `npm run clean` — hapus `dist/`
- CLI: `node dist/cli.js -h`, `... list`, `... run echo '{"a":1}'`

## Batasan
- Kontrak output tool = MCP `CallToolResult`: `{content, structuredContent?, isError}`
- CLI = binary tunggal `agent-toolkit` (`dist/cli.js`)
- `package.json` `exports`: `.`, `./tools`, `./utils`, `./types`, `./package.json`
