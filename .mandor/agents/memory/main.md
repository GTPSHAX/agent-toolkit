# main.md — agent-toolkit

## Status (2026-09-25)
Project jalan. `main` memuat semua fitur (PR #1-#8): 20 tool, CLI, dan MCP
stdio server. README dikerjakan di branch `docs/readme` (belum di-merge).

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
- `tests/` — 14 file (vitest, 138 test)
- `scripts/copy-types.mjs` — copy `src/types` → `dist/types`
- `dist/` — output build (di-gitignore)
- `README.md` — dokumentasi publik (CLI + MCP, daftar tool, kontrak, dev)

## Git
- Remote `origin`: https://github.com/GTPSHAX/agent-toolkit.git (private)
- `main` memuat semua fitur (PR #1-#8): 20 tool, CLI, MCP stdio.
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
