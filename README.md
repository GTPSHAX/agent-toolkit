# agent-toolkit

[![npm](https://img.shields.io/npm/v/@gtpshax/agent-toolkit.svg)](https://www.npmjs.com/package/@gtpshax/agent-toolkit)
[![CI](https://github.com/GTPSHAX/agent-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/GTPSHAX/agent-toolkit/actions/workflows/ci.yml)
[![Docs](https://github.com/GTPSHAX/agent-toolkit/actions/workflows/docs.yml/badge.svg)](https://github.com/GTPSHAX/agent-toolkit/actions/workflows/docs.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A standalone, zero-dependency TypeScript toolkit of tools that AI agents can
call. Every tool follows the Model Context Protocol (MCP) result shape, and the
same set of tools is exposed through two interfaces: a command-line interface
and a local MCP server over stdio.

- **Language:** TypeScript (ESM), Node.js
- **Runtime dependencies:** none (Node.js built-ins only)
- **Interfaces:** CLI and MCP stdio server
- **Tools:** 20

## Install

```sh
npm install -g @gtpshax/agent-toolkit   # global CLI
npm install @gtpshax/agent-toolkit      # library
```

## Quick start

```sh
npx @gtpshax/agent-toolkit list
npx @gtpshax/agent-toolkit describe hash
npx @gtpshax/agent-toolkit run hash '{"text":"abc"}'
```

From a checkout, build first and use the local CLI:

```sh
npm install
npm run build
node dist/cli.js list
```

## Interfaces

### CLI

```sh
agent-toolkit list [tool]          # list tools, or describe one
agent-toolkit describe <tool>      # parameters, example payload, output schema
agent-toolkit run <tool> [json]    # run a tool with JSON arguments
agent-toolkit mcp                  # run as a local MCP server over stdio
agent-toolkit help [tool]          # global help, or a tool spec
```

`describe` renders each tool's parameters and an example payload from its
schemas, so a model can learn how to call it without reading source code.

```
$ agent-toolkit describe uuid
uuid
  UUID

Generates version 4 UUIDs or validates a UUID string.

Parameters
  action <string> (required) one of generate|validate
  count <number> (optional) - Number of UUIDs to generate, 1 to 100.
  upper <boolean> (optional) - Return generated UUIDs in uppercase.
  value <string> (optional) - UUID string to validate.

Example arguments
  {"action":"generate","count":5}

Example call
  agent-toolkit run uuid '{"action":"generate","count":5}'

Output schema
  {...}
```

### MCP server (stdio)

```sh
agent-toolkit mcp
```

Speaks newline-delimited JSON-RPC 2.0 on stdin/stdout. Supported methods:
`initialize`, `notifications/initialized`, `notifications/cancelled`, `ping`,
`tools/list`, and `tools/call`. The server writes only MCP messages to stdout.

**opencode** (`opencode.json` / `.jsonc`) — note the `mcp` key, `"type": "local"`,
and `command` as a single array:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "agent-toolkit": {
      "type": "local",
      "command": ["node", "/absolute/path/to/agent-toolkit/dist/cli.js", "mcp"],
      "enabled": true
    }
  }
}
```

**Claude Desktop / Cursor** use `mcpServers` with `command` and `args`:

```json
{
  "mcpServers": {
    "agent-toolkit": {
      "command": "node",
      "args": ["/absolute/path/to/agent-toolkit/dist/cli.js", "mcp"]
    }
  }
}
```

## Tools

| Tool | Description |
| --- | --- |
| `echo` | Returns the provided arguments unchanged. |
| `text.stats` | Counts characters, words, lines, sentences, and unique words. |
| `json.format` | Parses and pretty-prints or compacts a JSON document. |
| `hash` | Hashes text with MD5, SHA-1, SHA-256, SHA-512, or ProtonHash. |
| `base64` | Encodes or decodes Base64 text. |
| `hex` | Encodes or decodes hexadecimal text. |
| `binary` | Encodes or decodes 8-bit binary text. |
| `url` | Encodes or decodes URL components. |
| `html` | Encodes or decodes HTML entities. |
| `rot13` | Applies the ROT13 substitution to ASCII letters. |
| `morse` | Encodes text as Morse code or decodes Morse code. |
| `jwt` | Decodes a JSON Web Token header and payload without verifying the signature. |
| `uuid` | Generates version 4 UUIDs or validates a UUID string. |
| `web.search` | Searches the web via Google (headless browser, no API key) or DuckDuckGo. |
| `web.fetch` | Fetches a page as readable text; reads PDFs and sitemaps. |
| `web.suggest` | Returns Google autocomplete suggestions; no API key. |
| `web.summary` | Searches and returns readable excerpts from top results. |
| `web.batch` | Runs several search queries in one call. |
| `web.verify` | Searches then verifies freshness and source metadata. |
| `web.research` | Saves or lists research records. |

### Web tools and API keys

The default search engine is **Google via a local headless Chrome/Edge browser**,
which requires no API key. Chrome or Edge must be installed (override the path
with the `CHROME_PATH` environment variable). A `google-api` engine is also
available for the official Custom Search JSON API, which requires
`GOOGLE_API_KEY` and `GOOGLE_CX`; it is optional and never required.

## Tool contract

Every tool returns an MCP-compatible result:

```ts
interface ToolOutput {
  readonly content: readonly ContentItem[];   // at least one item
  readonly structuredContent?: JsonValue;     // machine-readable payload
  readonly isError: boolean;                  // execution failure flag
}
```

Execution failures are reported in-band with `isError: true` and a message in
`content`. Each tool also declares an `inputSchema` and an `outputSchema`.

## Library usage

```ts
import {
  defaultTools,
  createRegistry,
  executeTool,
} from '@gtpshax/agent-toolkit';

const registry = createRegistry(defaultTools());
const result = await executeTool(registry, 'hash', {text: 'abc'});
console.log(result.structuredContent);
```

Subpath exports are available for `@gtpshax/agent-toolkit/tools`,
`@gtpshax/agent-toolkit/utils`, and `@gtpshax/agent-toolkit/types`.

## Development

```sh
npm run build       # compile to dist/ and copy declaration files
npm test            # run the test suite (vitest)
npm run test:watch  # watch mode
npm run lint        # lint and format check (gts)
npm run fix         # apply lint and formatting fixes
npm run docs        # generate API docs with Doxygen (needs doxygen)
npm run clean       # remove dist/
```

### Documentation

API documentation is generated with Doxygen:

```sh
npm run docs        # writes HTML to docs/api/html
```

The generated site is published to GitHub Pages by the `Docs` workflow on every
push to `main`. Because Doxygen has no dedicated TypeScript parser,
`Doxyfile` maps `.ts` to the JavaScript parser and pipes each file through
`scripts/doxygen-filter.mjs`, which strips TypeScript-only syntax while keeping
the comment blocks.

### Project layout

```
src/
├── index.ts            # library entry (re-exports + defaultTools)
├── cli.ts              # CLI entry (bin: agent-toolkit)
├── mcp.ts              # MCP stdio server
├── types/*.d.ts        # centralized public types
├── core/               # config, logger, errors
├── tools/              # one module per tool family, plus registry and executor
└── utils/              # pure helpers used by the tools
tests/                  # vitest suites
scripts/                # build helpers and the Doxygen input filter
```

Public types live in `src/types/*.d.ts`; implementation files use `.ts`. The
build compiles `src` to `dist` and then copies the hand-written declaration
files, since `tsc` does not emit them.

### Code style

Code follows the Google TypeScript Style, enforced by `gts`. Comments use
Doxygen/JSDoc blocks (`@brief`, `@param`, `@return`). Code, comments, and
identifiers are written in English.

### Releasing

Packages are published to npm by the `Publish` workflow when a `v*` tag is
pushed, using npm trusted publishing (OIDC) with no stored token and with
provenance.

```sh
npm version patch   # or minor / major
git push --follow-tags
```

The workflow requires the trusted publisher configured on npmjs.com for this
repository with the workflow filename `publish.yml`.

## License

MIT. See [LICENSE](LICENSE).
