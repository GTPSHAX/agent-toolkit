# main.md — agent-toolkit

## Status (2026-09-25)
Project jalan. `main` memuat scaffold + `text.stats` + `json.format` + `hash`
(PR #1-#3). Delapan tool encoding dikerjakan di branch `feat/encoding-tools`
(belum di-merge).

## Stack
- Bahasa: TypeScript `^6.0.3` (strict, `module: nodenext`, `target: esnext`, ESM `"type": "module"`)
- Runtime: Node.js (dev: v22.23.2)
- Library: zero runtime dependency (hanya Node built-in)
- Dev deps: `typescript`, `tsx`, `@types/node`, `vitest@5`, `gts@7`

## Struktur aktual
- `src/index.ts` — entry library (re-export + `defaultTools()`)
- `src/cli.ts` — entry CLI (bin `agent-toolkit`), `-h`/`list`/`run`
- `src/types/*.d.ts` — tipe publik terpusat (common, config, encoding, hash, json, text, tools, index)
- `src/core/` — `config.ts`, `logger.ts`, `errors.ts`
- `src/tools/` — `registry.ts`, `executor.ts` (`echo`), `args.ts`, `text-stats.ts` (`text.stats`), `json-format.ts` (`json.format`), `hash.ts` (`hash`), `base64.ts` (`base64`), `hex-binary.ts` (`hex`, `binary`), `url-html.ts` (`url`, `html`), `rot13-morse.ts` (`rot13`, `morse`), `jwt.ts` (`jwt`), `index.ts`
- `src/utils/` — `text.ts`, `text-stats.ts`, `json.ts`, `hash.ts`, `base64.ts`, `hex-binary.ts`, `url-html.ts`, `rot13-morse.ts`, `jwt.ts`, `index.ts`
- `tests/` — `text`, `tools`, `text-stats`, `json-format`, `hash`, `base64`, `hex-binary`, `url-html`, `rot13-morse`, `jwt` (vitest, 94 test)
- `scripts/copy-types.mjs` — copy `src/types` → `dist/types`
- `dist/` — output build (di-gitignore)

## Git
- Remote `origin`: https://github.com/GTPSHAX/agent-toolkit.git (private)
- `main` memuat `text.stats` (PR #1), `json.format` (PR #2), `hash` (PR #3).
- Branch `feat/encoding-tools`: base64, hex, binary, url, html, rot13, morse, jwt (belum di-merge).
- Tool terdaftar di `defaultTools`: 12.

## Config
- `tsconfig.json` — dev/typecheck (`noEmit: true`, include `src`+`tests`)
- `tsconfig.build.json` — build (`rootDir: src`, `outDir: dist`, declaration on)
- `eslint.config.mjs` — extends `gts`, ignores `dist/`
- `.prettierrc.cjs` — `...require('gts/.prettierrc.json')`
- `.gitignore` — `node_modules/`, `dist/`
- `.gitattributes` — `* text=auto eol=lf` (jaga EOL LF di checkout; dengan
  `core.autocrlf=true` tanpa ini, Prettier gagal tiap checkpoint)

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
