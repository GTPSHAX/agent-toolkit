# concept.md — agent-toolkit

## Domain
Standalone toolkit berisi beberapa tools yang bisa digunakan oleh AI agentic.
Distribusi ganda: library (impor per modul) + satu CLI runnable (`agent-toolkit -h`).

## Kontrak output tool
Ikut spek MCP (`CallToolResult`): `{content, structuredContent?, isError}`.
Referensi: MCP spec 2025-06-18 server/tools.
- `content`: array item (`text`/`image`/`resource_link`), minimal satu item.
- Error eksekusi → `isError: true` + detail di `content`.
- `structuredContent` (opsional) + serialisasi JSON-nya di satu blok `TextContent`.
- Tiap tool punya `inputSchema` dan opsional `outputSchema`.
- Observabilitas (`durationMs`, `requestId`) lapisan executor, bukan kontrak output.

## Layout (Opsi 1)
`src/types/*.d.ts` terpusat; implementasi per domain (`core/`, `tools/`, `utils/`).
Tipe publik hanya `.d.ts` di `src/types/`; file `.ts` untuk implementasi.
Output build `dist/` mirror `src/` (`*.js` + `*.d.ts`), tidak di-commit.

```
src/
├── index.ts                  # library entry
├── cli.ts                    # CLI entry (bin: agent-toolkit)
├── types/
│   ├── index.d.ts
│   ├── common.d.ts
│   ├── config.d.ts
│   └── tools.d.ts
├── core/
│   ├── config.ts
│   ├── logger.ts
│   └── errors.ts
├── tools/
│   ├── index.ts
│   ├── registry.ts
│   └── executor.ts
└── utils/
    ├── index.ts
    └── text.ts
dist/
├── index.js / index.d.ts
├── types/*.d.ts
├── core/*.js / *.d.ts
├── tools/*.js / *.d.ts
└── utils/*.js / *.d.ts
tests/
docs/
examples/
```

## Gaya kode
Google TypeScript Style + `gts` sebagai penegak otomatis.
- Named exports only (tanpa default export); `const` by default; modules per file.
- `import type` untuk simbol yang hanya dipakai sebagai tipe.
- `gts` devDependency; bukan runtime dep.

## Status
Fase konsep selesai; scaffold awal sudah ada dan terverifikasi.
