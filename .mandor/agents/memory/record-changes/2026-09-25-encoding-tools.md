# 2026-09-25 — Add encoding tools

## Scope
Eight encoding/decoding tools, on branch `feat/encoding-tools` (base `main`).

## What changed
- `src/types/encoding.d.ts`: `CodecMode`, `EncodingFormat`, `JwtParts`.
- `src/tools/args.ts`: shared `isArgsObject`, `readString`, `readBoolean`,
  `readMode`.
- `src/utils/base64.ts` + `src/tools/base64.ts`: `base64`.
- `src/utils/hex-binary.ts` + `src/tools/hex-binary.ts`: `hex`, `binary`.
- `src/utils/url-html.ts` + `src/tools/url-html.ts`: `url`, `html`.
- `src/utils/rot13-morse.ts` + `src/tools/rot13-morse.ts`: `rot13`, `morse`.
- `src/utils/jwt.ts` + `src/tools/jwt.ts`: `jwt`.
- Registered all eight in `defaultTools`; exported helpers and types from the
  package root.
- Tests: `base64`, `hex-binary`, `url-html`, `rot13-morse`, `jwt`.

## Tool contracts
- Input mode is a required `mode: "encode" | "decode"` for reversible tools.
- `base64`: `urlSafe` option; accepts standard/URL-safe alphabet on decode.
- `hex`: `upper` option; decode tolerates whitespace and odd casing.
- `binary`: 8-bit groups; decode tolerates whitespace.
- `url`: `full` option switches between component and whole-URL handling.
- `html`: encodes `& < > " '`; decodes named entities (amp, lt, gt, quot, apos,
  nbsp), decimal `&#N;`, and hex `&#xH;`.
- `rot13`: substitution over ASCII letters.
- `morse`: letters/digits/punctuation; letters separated by space, words by
  ` / `; unknown tokens error.
- `jwt`: decodes header/payload base64url segments; no signature verification.
- Invalid input returns `isError: true`.

## Sources
- Format list from TinyFn "Encoding MCP Tools for AI Agents"
  (`tinyfn.io/blog/agent-encode-mcp-tools`) and IT Tools MCP Server.

## Verification
- `npm test` → 94 tests pass.
- `npm run lint` → clean.
- `npm run build` → exit 0.
- `node dist/cli.js list` → 12 tools listed.

## Not done
- Branch not merged into `main` (user owns merges).
