/**
 * @fileoverview The built-in `web.*` tools.
 */

import type {JsonValue} from '../types/common.js';
import type {
  CrawlResult,
  FreshnessWindow,
  SearchEngine,
  SearchResult,
  SearchTab,
} from '../types/web.js';
import type {ToolDefinition, ToolOutput} from '../types/tools.js';
import type {JsonSchema} from '../types/tools.js';
import {crawlSitemap, fetchDocument} from '../utils/web-fetch.js';
import {crawlDocumentation} from '../utils/web-crawl.js';
import {
  isFreshnessWindow,
  isSearchEngine,
  isSearchTab,
  listResearch,
  multiSourceSearch,
  saveResearch,
  search,
  searchBatch,
  summarize,
  verifyFreshness,
  verifySources,
} from '../utils/web-search.js';
import {googleSuggest} from '../utils/web-engines.js';
import {readBoolean, readString} from './args.js';
import {failure, success} from './executor.js';

/** Search tool name. */
export const WEB_SEARCH_TOOL_NAME = 'web.search';
/** Fetch tool name. */
export const WEB_FETCH_TOOL_NAME = 'web.fetch';
/** Suggest tool name. */
export const WEB_SUGGEST_TOOL_NAME = 'web.suggest';
/** Summary tool name. */
export const WEB_SUMMARY_TOOL_NAME = 'web.summary';
/** Batch tool name. */
export const WEB_BATCH_TOOL_NAME = 'web.batch';
/** Verification tool name. */
export const WEB_VERIFY_TOOL_NAME = 'web.verify';
/** Research tool name. */
export const WEB_RESEARCH_TOOL_NAME = 'web.research';

/** Upper bound on results per request. */
export const MAX_RESULTS = 100;

/** Output schema shared by every result-producing web tool. */
const SEARCH_RESULT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    title: {type: 'string'},
    url: {type: 'string'},
    snippet: {type: 'string'},
    source: {type: 'string'},
    age: {type: 'string'},
    publishedAt: {type: 'string'},
    thumbnail: {type: 'string'},
    canonicalUrl: {type: 'string'},
    duplicate: {type: 'boolean'},
    rank: {type: 'number'},
    score: {type: 'number'},
    sourceEngine: {type: 'string'},
  },
  required: ['title', 'url'],
};

/**
 * @brief Creates the `web.search` tool.
 *
 * @return A tool definition that searches the web.
 */
export function webSearchTool(): ToolDefinition {
  return {
    name: WEB_SEARCH_TOOL_NAME,
    title: 'Web search',
    description:
      'Searches the web via Google (headless browser, no API key) or DuckDuckGo.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {type: 'string', description: 'Search query.'},
        engine: {
          type: 'string',
          description: 'Search engine; google needs no API key.',
          enum: ['google', 'duckduckgo', 'google-api'],
        },
        limit: {type: 'number', description: 'Maximum results, 0 for all.'},
        tab: {
          type: 'string',
          description: 'Google tab (google engine only).',
          enum: ['web', 'news', 'images', 'videos'],
        },
        fresh: {
          type: 'string',
          description: 'Freshness window (google engine only).',
          enum: ['hour', 'day', 'week', 'month'],
        },
        site: {type: 'string', description: 'Restrict to a domain.'},
        multiSource: {
          type: 'boolean',
          description: 'Query all engines and group corroborated results.',
        },
        noCache: {type: 'boolean', description: 'Skip the disk cache.'},
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        query: {type: 'string'},
        results: {type: 'array', items: SEARCH_RESULT_SCHEMA},
      },
      required: ['query', 'results'],
    },
    handler: handleWebSearch,
  };
}

/**
 * @brief Creates the `web.fetch` tool.
 *
 * @return A tool definition that reads pages, documents, sitemaps, or a
 *   linked documentation subtree.
 */
export function webFetchTool(): ToolDefinition {
  return {
    name: WEB_FETCH_TOOL_NAME,
    title: 'Web fetch',
    description:
      'Fetches a page as Markdown; reads PDFs and sitemaps; crawls linked ' +
      'documentation up to a depth.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {type: 'string', description: 'Absolute http(s) URL.'},
        mode: {
          type: 'string',
          description: 'Fetch a page/document or a sitemap.',
          enum: ['document', 'sitemap'],
        },
        depth: {
          type: 'number',
          description:
            'Link-following depth, 1-5; above 1 crawls the documentation.',
        },
        maxPages: {type: 'number', description: 'Maximum pages when crawling.'},
        sameOrigin: {
          type: 'boolean',
          description: 'Restrict crawled pages to the entry origin.',
        },
        maxLength: {type: 'number', description: 'Maximum characters.'},
        noCache: {type: 'boolean', description: 'Skip the disk cache.'},
      },
      required: ['url'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        url: {type: 'string'},
        status: {type: 'number'},
        title: {type: 'string'},
        text: {type: 'string'},
        markdown: {type: 'string'},
        contentType: {type: 'string'},
        bytes: {type: 'number'},
        sitemap: {type: 'string'},
        urls: {type: 'array', items: {type: 'string'}},
        count: {type: 'number'},
        depth: {type: 'number'},
        pages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: {type: 'string'},
              depth: {type: 'number'},
              title: {type: 'string'},
              markdown: {type: 'string'},
            },
            required: ['url', 'depth', 'title', 'markdown'],
          },
        },
        errors: {type: 'array'},
        visited: {type: 'number'},
        truncated: {type: 'boolean'},
        fetchedAt: {type: 'string'},
      },
      required: ['url'],
    },
    handler: handleWebFetch,
  };
}

/**
 * @brief Creates the `web.suggest` tool.
 *
 * @return A tool definition for Google autocomplete.
 */
export function webSuggestTool(): ToolDefinition {
  return {
    name: WEB_SUGGEST_TOOL_NAME,
    title: 'Web suggest',
    description: 'Returns Google autocomplete suggestions; no API key.',
    inputSchema: {
      type: 'object',
      properties: {query: {type: 'string', description: 'Partial query.'}},
      required: ['query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        query: {type: 'string'},
        suggestions: {type: 'array', items: {type: 'string'}},
      },
      required: ['query', 'suggestions'],
    },
    handler: handleWebSuggest,
  };
}

/**
 * @brief Creates the `web.summary` tool.
 *
 * @return A tool definition that searches and reads top excerpts.
 */
export function webSummaryTool(): ToolDefinition {
  return {
    name: WEB_SUMMARY_TOOL_NAME,
    title: 'Web summary',
    description: 'Searches and returns readable excerpts from top results.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {type: 'string'},
        top: {type: 'number', description: 'Results to read (default 3).'},
        excerptLength: {type: 'number', description: 'Characters per excerpt.'},
        engine: {type: 'string', enum: ['google', 'duckduckgo', 'google-api']},
        site: {type: 'string'},
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        query: {type: 'string'},
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: {type: 'string'},
              url: {type: 'string'},
              excerpt: {type: 'string'},
              error: {type: 'string'},
            },
            required: ['title', 'url', 'excerpt'],
          },
        },
      },
      required: ['query', 'items'],
    },
    handler: handleWebSummary,
  };
}

/**
 * @brief Creates the `web.batch` tool.
 *
 * @return A tool definition that runs several queries.
 */
export function webBatchTool(): ToolDefinition {
  return {
    name: WEB_BATCH_TOOL_NAME,
    title: 'Web batch',
    description: 'Runs several search queries in one call.',
    inputSchema: {
      type: 'object',
      properties: {
        queries: {type: 'array', description: 'List of search queries.'},
        engine: {type: 'string', enum: ['google', 'duckduckgo', 'google-api']},
        limit: {type: 'number'},
      },
      required: ['queries'],
    },
    outputSchema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          query: {type: 'string'},
          results: {type: 'array', items: SEARCH_RESULT_SCHEMA},
          error: {type: 'string'},
        },
        required: ['query'],
      },
    },
    handler: handleWebBatch,
  };
}

/**
 * @brief Creates the `web.verify` tool.
 *
 * @return A tool definition that verifies result freshness and sources.
 */
export function webVerifyTool(): ToolDefinition {
  return {
    name: WEB_VERIFY_TOOL_NAME,
    title: 'Web verify',
    description: 'Searches then verifies freshness and source metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {type: 'string'},
        checks: {
          type: 'array',
          description: 'Checks to run: freshness, sources.',
        },
        limit: {type: 'number'},
        engine: {type: 'string', enum: ['google', 'duckduckgo', 'google-api']},
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        query: {type: 'string'},
        results: {type: 'array', items: SEARCH_RESULT_SCHEMA},
      },
      required: ['query', 'results'],
    },
    handler: handleWebVerify,
  };
}

/**
 * @brief Creates the `web.research` tool.
 *
 * @return A tool definition that saves and lists research records.
 */
export function webResearchTool(): ToolDefinition {
  return {
    name: WEB_RESEARCH_TOOL_NAME,
    title: 'Web research',
    description: 'Saves or lists research records.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {type: 'string', enum: ['save', 'list']},
        query: {type: 'string'},
        note: {type: 'string'},
        urls: {type: 'array'},
      },
      required: ['action'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        action: {type: 'string'},
        records: {type: 'array'},
        record: {type: 'object'},
      },
      required: ['action'],
    },
    handler: handleWebResearch,
  };
}

/**
 * @brief Handles a `web.search` invocation.
 *
 * @param args Arguments carrying the query and options.
 * @return Search output, or an error output.
 */
async function handleWebSearch(args: JsonValue): Promise<ToolOutput> {
  const query = readString(args, 'query');
  if (query === undefined) {
    return failure('web.search requires a "query" string argument');
  }
  try {
    if (readBoolean(args, 'multiSource') === true) {
      const result = await multiSourceSearch(query, searchOptions(args));
      return success(
        `${result.corroborated.length} corroborated of ${result.allGroups.length} groups`,
        toJson(result),
      );
    }
    const results = await search(query, searchOptions(args));
    return success(formatResults(results), toJson({query, results}));
  } catch (cause) {
    return failure(`web.search: ${errorMessage(cause)}`);
  }
}

/**
 * @brief Handles a `web.fetch` invocation.
 *
 * Reads a single page, follows linked pages up to `depth`, or reads a sitemap.
 *
 * @param args Arguments carrying the URL and options.
 * @return Page, crawl, or sitemap output, or an error output.
 */
async function handleWebFetch(args: JsonValue): Promise<ToolOutput> {
  const url = readString(args, 'url');
  if (url === undefined) {
    return failure('web.fetch requires a "url" string argument');
  }
  const maxLength = readNumber(args, 'maxLength');
  const noCache = readBoolean(args, 'noCache');
  const depth = readNumber(args, 'depth');
  try {
    if (readString(args, 'mode') === 'sitemap') {
      const sitemap = await crawlSitemap(url);
      return success(sitemap.urls.join('\n'), toJson(sitemap));
    }
    const shared = {
      ...(maxLength === undefined ? {} : {maxLength}),
      ...(noCache === undefined ? {} : {noCache}),
    };
    if (depth !== undefined && depth > 1) {
      const maxPages = readNumber(args, 'maxPages');
      const sameOrigin = readBoolean(args, 'sameOrigin');
      const crawl = await crawlDocumentation(url, {
        ...shared,
        depth,
        ...(maxPages === undefined ? {} : {maxPages}),
        ...(sameOrigin === undefined ? {} : {sameOrigin}),
      });
      return success(formatCrawl(crawl), toJson(crawl));
    }
    const page = await fetchDocument(url, shared);
    return success(page.markdown, toJson(page));
  } catch (cause) {
    return failure(`web.fetch: ${errorMessage(cause)}`);
  }
}

/**
 * @brief Handles a `web.suggest` invocation.
 *
 * @param args Arguments carrying the query.
 * @return Suggestions, or an error output.
 */
async function handleWebSuggest(args: JsonValue): Promise<ToolOutput> {
  const query = readString(args, 'query');
  if (query === undefined) {
    return failure('web.suggest requires a "query" string argument');
  }
  try {
    const suggestions = await googleSuggest(query);
    return success(suggestions.join('\n'), toJson({query, suggestions}));
  } catch (cause) {
    return failure(`web.suggest: ${errorMessage(cause)}`);
  }
}

/**
 * @brief Handles a `web.summary` invocation.
 *
 * @param args Arguments carrying the query and options.
 * @return Brief output, or an error output.
 */
async function handleWebSummary(args: JsonValue): Promise<ToolOutput> {
  const query = readString(args, 'query');
  if (query === undefined) {
    return failure('web.summary requires a "query" string argument');
  }
  try {
    const brief = await summarize(
      query,
      readNumber(args, 'top') ?? 3,
      readNumber(args, 'excerptLength') ?? 800,
      searchOptions(args),
    );
    const text = brief.items
      .map(
        (item, index) =>
          `## ${index + 1}. ${item.title}\n${item.url}\n\n${item.excerpt}`,
      )
      .join('\n\n');
    return success(text, toJson(brief));
  } catch (cause) {
    return failure(`web.summary: ${errorMessage(cause)}`);
  }
}

/**
 * @brief Handles a `web.batch` invocation.
 *
 * @param args Arguments carrying the query list and options.
 * @return Batch output, or an error output.
 */
async function handleWebBatch(args: JsonValue): Promise<ToolOutput> {
  const queries = readStringArray(args, 'queries');
  if (queries === undefined || queries.length === 0) {
    return failure('web.batch requires a non-empty "queries" array');
  }
  try {
    const batched = await searchBatch(queries, searchOptions(args));
    return success(JSON.stringify(batched), toJson(batched));
  } catch (cause) {
    return failure(`web.batch: ${errorMessage(cause)}`);
  }
}

/**
 * @brief Handles a `web.verify` invocation.
 *
 * @param args Arguments carrying the query and checks.
 * @return Verification output, or an error output.
 */
async function handleWebVerify(args: JsonValue): Promise<ToolOutput> {
  const query = readString(args, 'query');
  if (query === undefined) {
    return failure('web.verify requires a "query" string argument');
  }
  const checks = readStringArray(args, 'checks') ?? ['freshness', 'sources'];
  try {
    const results = await search(query, searchOptions(args));
    let verified = results;
    if (checks.includes('freshness')) {
      verified = await verifyFreshness(results);
    }
    if (checks.includes('sources')) {
      verified = await verifySources(verified);
    }
    return success(
      JSON.stringify(verified),
      toJson({query, results: verified}),
    );
  } catch (cause) {
    return failure(`web.verify: ${errorMessage(cause)}`);
  }
}

/**
 * @brief Handles a `web.research` invocation.
 *
 * @param args Arguments carrying the action and record fields.
 * @return Saved or listed records, or an error output.
 */
function handleWebResearch(args: JsonValue): ToolOutput {
  const action = readString(args, 'action');
  if (action === 'list') {
    const records = listResearch();
    return success(JSON.stringify(records), toJson({action, records}));
  }
  if (action === 'save') {
    const query = readString(args, 'query');
    if (query === undefined) {
      return failure('web.research save requires a "query" string argument');
    }
    const note = readString(args, 'note');
    const urls = readStringArray(args, 'urls');
    const record = saveResearch({
      query,
      ...(note === undefined ? {} : {note}),
      ...(urls === undefined ? {} : {urls}),
    });
    return success(JSON.stringify(record), toJson({action, record}));
  }
  return failure('web.research: "action" must be "save" or "list"');
}

/**
 * @brief Builds search options from tool arguments.
 *
 * @param args Argument value of unknown shape.
 * @return Validated search options.
 */
function searchOptions(args: JsonValue): {
  engine?: SearchEngine;
  limit?: number;
  tab?: SearchTab;
  fresh?: FreshnessWindow | null;
  site?: string;
  noCache?: boolean;
} {
  const engine = readString(args, 'engine');
  const tab = readString(args, 'tab');
  const fresh = readString(args, 'fresh');
  const site = readString(args, 'site');
  const limit = readNumber(args, 'limit');
  const noCache = readBoolean(args, 'noCache');
  return {
    ...(isSearchEngine(engine) ? {engine} : {}),
    ...(isSearchTab(tab) ? {tab} : {}),
    ...(isFreshnessWindow(fresh) ? {fresh} : {}),
    ...(site === undefined ? {} : {site}),
    ...(limit === undefined ? {} : {limit: clampLimit(limit)}),
    ...(noCache === undefined ? {} : {noCache}),
  };
}

/**
 * @brief Clamps a requested limit to the supported range.
 *
 * @param value Requested limit.
 * @return Limit between 0 and {@link MAX_RESULTS}.
 */
function clampLimit(value: number): number {
  return Math.min(MAX_RESULTS, Math.max(0, Math.trunc(value)));
}

/**
 * @brief Reads a numeric field from tool arguments.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name.
 * @return The number when present and finite, otherwise `undefined`.
 */
function readNumber(args: JsonValue, key: string): number | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return undefined;
  }
  const value = args[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * @brief Reads a string-array field from tool arguments.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name.
 * @return The string array when valid, otherwise `undefined`.
 */
function readStringArray(args: JsonValue, key: string): string[] | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return undefined;
  }
  const value = args[key];
  return Array.isArray(value) &&
    value.every((item): item is string => typeof item === 'string')
    ? value
    : undefined;
}

/**
 * @brief Renders a crawl as one Markdown document.
 *
 * @param crawl Crawl result.
 * @return Concatenated Markdown with a metadata header.
 */
function formatCrawl(crawl: CrawlResult): string {
  const header = [
    '# Extracted documentation',
    '',
    `Root: ${crawl.root}`,
    `Depth: ${crawl.depth} · Pages: ${crawl.pages.length} · ` +
      `Errors: ${crawl.errors.length} · Truncated: ${crawl.truncated}`,
    `Fetched: ${crawl.fetchedAt}`,
  ].join('\n');
  const sections = crawl.pages.map(
    page =>
      `## ${page.title || page.url}\n\n` +
      `Source: ${page.url} · Depth: ${page.depth}\n\n${page.markdown}`,
  );
  const failures = crawl.errors.map(
    entry => `- ${entry.url} (depth ${entry.depth}): ${entry.error}`,
  );
  return [
    header,
    ...sections,
    ...(failures.length > 0 ? ['## Unreachable pages', '', ...failures] : []),
  ].join('\n\n');
}

/**
 * @brief Renders results as readable text.
 *
 * @param results Search results.
 * @return One block per result.
 */
function formatResults(results: readonly SearchResult[]): string {
  return results
    .map((result, index) => {
      const meta = [result.source, result.age].filter(Boolean).join(' · ');
      return [
        `${index + 1}. ${result.title}`,
        `   ${result.url}`,
        ...(meta ? [`   [${meta}]`] : []),
        ...(result.snippet ? [`   ${result.snippet}`] : []),
      ].join('\n');
    })
    .join('\n\n');
}

/**
 * @brief Converts a value into JSON-safe tool payload data.
 *
 * @param value Value to convert.
 * @return JSON-compatible value.
 */
function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

/**
 * @brief Extracts a message from an unknown thrown value.
 *
 * @param cause Thrown value.
 * @return Human-readable message.
 */
function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
