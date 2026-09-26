# main.md — agent-toolkit

## Status (2026-09-26)
Project jalan dan publik. `main` memuat semua fitur (PR #1-#11). Publish npm
dikerjakan di branch `feat/npm-publish` (belum di-merge).

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
- `src/tools/` — `registry.ts`, `executor.ts` (`echo`), `args.ts`, `text-stats.ts`, `json-format.ts`, `json-query.ts`, `regex.ts`, `hash.ts`, `base64.ts`, `hex-binary.ts`, `url-html.ts`, `rot13-morse.ts`, `jwt.ts`, `uuid.ts`, `web.ts` (8 tool `web.*`), `index.ts`
- `src/utils/` — `text.ts`, `text-stats.ts`, `json.ts`, `json-query.ts`, `regex.ts`, `hash.ts`, `base64.ts`, `hex-binary.ts`, `url-html.ts`, `rot13-morse.ts`, `jwt.ts`, `uuid.ts`, `web-core.ts`, `web-engines.ts`, `web-fetch.ts`, `html-to-markdown.ts`, `web-crawl.ts`, `web-request.ts`, `web-search.ts`, `index.ts`
- `tests/` — 16 file (vitest, 160 test)
- `scripts/copy-types.mjs` — copy `src/types` → `dist/types`
- `scripts/doxygen-filter.mjs` — filter TypeScript→JS untuk Doxygen
- `Doxyfile` — konfigurasi Doxygen (README sebagai main page)
- `.github/workflows/ci.yml` — lint/build/test (Node 22, 24)
- `.github/workflows/docs.yml` — build Doxygen + deploy GitHub Pages
- `.github/workflows/publish.yml` — publish npm via OIDC (trigger tag `v*`)
- `LICENSE` — MIT
- `dist/` — output build (di-gitignore)
- `docs/api/` — output Doxygen (di-gitignore)
- `README.md` — dokumentasi publik (CLI + MCP, daftar tool, kontrak, dev)

## Git
- Remote `origin`: https://github.com/GTPSHAX/agent-toolkit.git (public)
- `main` memuat semua fitur (PR #1-#11).
- Nama package npm: `@gtpshax/agent-toolkit` (unscoped `agent-toolkit` sudah dipakai orang lain).
- Package terbit: `@gtpshax/agent-toolkit` (`1.0.0` manual, `1.0.1` via workflow OIDC + provenance).
- Publish otomatis jalan: push tag `v*` → workflow `Publish` → OIDC, tanpa token, dengan provenance.
- Rilis: `npm version patch && git push --follow-tags`.
- GitHub Pages aktif (`build_type: workflow`): https://gtpshax.github.io/agent-toolkit/
- Publish npm pakai trusted publishing (OIDC), tanpa token; setup di npmjs.com
  dengan workflow filename `publish.yml`.
- Tool terdaftar di `defaultTools`: 23.
- Web: default engine `google` via headless Chrome/Edge (tanpa API key);
  `google-api` opsional (butuh `GOOGLE_API_KEY` + `GOOGLE_CX`).

## Config
- `tsconfig.json` — dev/typecheck (`noEmit: true`, include `src`+`tests`)
- `tsconfig.build.json` — build (`rootDir: src`, `outDir: dist`, declaration on)
- `eslint.config.mjs` — extends `gts`, ignores `dist/` dan `docs/api/`
- `.prettierrc.cjs` — `...require('gts/.prettierrc.json')`
- `.gitignore` — `node_modules/`, `dist/`, `docs/api/`
- `.gitattributes` — `* text=auto eol=lf` (jaga EOL LF di checkout; dengan
  `core.autocrlf=true` tanpa ini, Prettier gagal tiap checkpoint)
- `package.json` `license`: MIT; `engines`: Node >= 18; name `@gtpshax/agent-toolkit`

## Perintah
- `npm run build` — `tsc -p tsconfig.build.json` + copy types
- `npm test` — `vitest run`
- `npm run lint` / `npm run fix` — `gts lint` / `gts fix`
- `npm run clean` — hapus `dist/`
- `npm run docs` — generate API docs Doxygen ke `docs/api/html`
- CLI: `node dist/cli.js -h`, `... list`, `... list <tool>`, `... describe <tool>`,
  `... run <tool> '{"json":...}'`, `... mcp`

## Batasan
- Kontrak output tool = MCP `CallToolResult`: `{content, structuredContent?, isError}`
- CLI = binary tunggal `agent-toolkit` (`dist/cli.js`)
- Antarmuka: CLI subcommand + MCP stdio (`agent-toolkit mcp`)
- opencode config: key `mcp`, `"type": "local"`, `command` sebagai satu array
- `package.json` `exports`: `.`, `./tools`, `./utils`, `./types`, `./package.json`
