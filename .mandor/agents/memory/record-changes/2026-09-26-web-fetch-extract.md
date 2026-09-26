# 2026-09-26 — Markdown fetch and depth crawl for web.fetch

## Scope
Extract documentation from the web tools: fetched pages become Markdown and
`web.fetch` can follow in-content links up to a depth. Branch
`feat/web-fetch-extract` (base `main`). Two commits: feature, then docs.

## What changed
- `src/utils/html-to-markdown.ts` (new): zero-dependency HTML-to-Markdown
  converter and `readHtmlAttribute`. Handles headings, paragraphs, links,
  images, emphasis, inline/fenced code, ordered/unordered/nested lists,
  blockquotes, `hr`, and tables. Relative URLs are resolved with `baseUrl`.
- `src/utils/web-crawl.ts` (new): `crawlDocumentation` (breadth-first) and
  `extractLinks` (reads both `<a href>` and Markdown `[text](url)`). Reads pages
  through `fetchDocument`, so each entry carries Markdown. Constants:
  `DEFAULT_CRAWL_DEPTH = 1`, `MAX_CRAWL_DEPTH = 5`, `DEFAULT_MAX_PAGES = 25`,
  `MAX_CRAWL_PAGES = 100`, `DEFAULT_CRAWL_MAX_LENGTH = 20000`.
- `src/types/web.d.ts`: `PageContent.markdown`; new `CrawlOptions`, `CrawlPage`,
  `CrawlError`, `CrawlResult`.
- `src/utils/web-fetch.ts`: `fetchPage` renders `markdown`; HTML branch returns it,
  the PDF branch sets `markdown: ''`.
- `src/tools/web.ts`: `web.fetch` accepts `depth`, `maxPages`, `sameOrigin`,
  `noCache`; returns Markdown (`page.markdown`) or a concatenated crawl document
  (`formatCrawl`) when `depth > 1`.
- Exports: `utils/index.ts`, `types/index.d.ts`, `src/index.ts`.
- `README.md`: Markdown output plus depth/maxPages/sameOrigin examples.
- `tests/html-to-markdown.test.ts` (new): 12 tests; `tests/tools.test.ts`
  narrowed a `content[0]` access for the union type.

## Tool contract
- `web.fetch`: `url`, `mode` (`document` | `sitemap`), `depth` (1-5),
  `maxPages`, `sameOrigin`, `maxLength`, `noCache`.
- Output text is Markdown. `structuredContent` for a single page includes
  `markdown`; for a crawl it is `{root, depth, pages, errors, visited,
  truncated, fetchedAt}`.

## Verification
- `npm test` → 150 tests pass (15 files).
- `npm run lint` → clean; `npm run build` → exit 0.
- Live: `web.fetch https://example.com` → Markdown with an absolute link;
  `depth: 2` on `https://nodejs.org/en/about` → root + 3 depth-1 pages,
  `truncated: true` at `maxPages: 4`.

## Not done
- Branch not merged into `main` (user owns merges). PR #16 open.
