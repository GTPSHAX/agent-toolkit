# main.md — agent-toolkit

## Status (2026-09-25)
Project jalan. `main` memuat scaffold + text/json/hash + 8 encoding + uuid +
7 web + CLI describe (PR #1-#7). MCP stdio server dikerjakan di branch
`feat/mcp-stdio` (belum di-merge). 20 tool terdaftar; dua antarmuka: CLI dan MCP.

## Stack
- Bahasa: TypeScript `^6.0.3` (strict, `module: nodenext`, `target: esnext`, ESM `"type": "module"`)
- Runtime: Node.js (dev: v22.23.2)
- Library: zero runtime dependency (hanya Node built-in)
- Dev deps: `typescript`, `tsx`, `@types/node`, `vitest@5`, `gts@7`

## Struktur aktual
- `src/index.ts` — entry library (re-export + `defaultTools()`)
- `src/cli.ts` — entry CLI (bin `agent-toolkit`), `-h`/`list`/`describe`/`run`/`mcp`
- `src/mcp.ts` — MCP stdio server (JSON-RPC 2.0)
- `src/types/*.d.ts` — tipe publik terpusat (common, config, encoding, hash, json, text, tools, uuid, web, index)
- `src/core/` — `config.ts`, `logger.ts`, `errors.ts`
- `src/tools/` — `registry.ts`, `executor.ts` (`echo`), `args.ts`, `text-stats.ts`, `json-format.ts`, `hash.ts`, `base64.ts`, `hex-binary.ts`, `url-html.ts`, `rot13-morse.ts`, `jwt.ts`, `uuid.ts`, `web.ts` (7 tool `web.*`), `index.ts`
- `src/utils/` — `text.ts`, `text-stats.ts`, `json.ts`, `hash.ts`, `base64.ts`, `hex-binary.ts`, `url-html.ts`, `rot13-morse.ts`, `jwt.ts`, `uuid.ts`, `web-core.ts`, `web-engines.ts`, `web-fetch.ts`, `web-search.ts`, `index.ts`
- `tests/` — 12 file (vitest, 119 test)
- `scripts/copy-types.mjs` — copy `src/types` → `dist/types`
- `dist/` — output build (di-gitignore)
- `scripts/copy-types.mjs` — copy `src/types` → `dist/types`
- `dist/` — output build (di-gitignore)

## Git
- Remote `origin`: https://github.com/GTPSHAX/agent-toolkit.git (private)
- `main` memuat text/json/hash (PR #1-#3), 8 encoding (PR #4), uuid (PR #5), 7 web (PR #6).
- Branch `feat/cli-tool-describe`: CLI `describe` + per-tool help (belum di-merge).
- Tool terdaftar di `defaultTools`: 20.
- Web: default engine `google` via headless Chrome/Edge (tanpa API key);
  `google-api` opsional (butuh `GOOGLE_API_KEY` + `GOOGLE_CX`).

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
- CLI: `node dist/cli.js -h`, `... list`, `... list <tool>`, `... describe <tool>`,
  `... run <tool> '{"json":...}'`, `... mcp`

## Batasan
- Kontrak output tool = MCP `CallToolResult`: `{content, structuredContent?, isError}`
- CLI = binary tunggal `agent-toolkit` (`dist/cli.js`)
- Antarmuka: CLI subcommand + MCP stdio (`agent-toolkit mcp`)
- opencode config: key `mcp`, `"type": "local"`, `command` sebagai satu array
- `package.json` `exports`: `.`, `./tools`, `./utils`, `./types`, `./package.json`
