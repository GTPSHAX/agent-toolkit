/**
 * @fileoverview Search dispatch, ranking, corroboration, and research helpers.
 */

import {appendFileSync, readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';

import type {
  BatchItem,
  EngineOutcome,
  FreshnessWindow,
  MultiSourceResult,
  QualityLabel,
  ResearchRecord,
  ScoreSignals,
  SearchBrief,
  SearchEngine,
  SearchOptions,
  SearchResult,
  SearchTab,
  VerifiedResult,
} from '../types/web.js';
import {DEFAULT_TIMEOUT_MS, canonicalUrl} from './web-core.js';
import {fetchPage, fetchDocument} from './web-fetch.js';
import {runEngine} from './web-engines.js';
import {cacheGet, cacheSet} from './web-core.js';

/** Default search engine. */
export const DEFAULT_ENGINE: SearchEngine = 'google';

/** Engines queried by a multi-source search. */
export const DEFAULT_ENGINES: readonly SearchEngine[] = [
  'google',
  'duckduckgo',
];

/** Default number of results per search. */
export const DEFAULT_LIMIT = 8;

/**
 * @brief Annotates duplicate results without removing any.
 *
 * @param results Search results.
 * @return Results annotated with `canonicalUrl` and duplicate markers.
 */
export function annotateDuplicates(
  results: readonly SearchResult[],
): SearchResult[] {
  const firstByCanonical = new Map<string, number>();
  return results.map((result, index) => {
    const canonical = canonicalUrl(result.url);
    const first = firstByCanonical.get(canonical);
    const annotated: SearchResult = {
      ...result,
      canonicalUrl: canonical,
      duplicate: Boolean(first),
    };
    if (first) {
      return {...annotated, duplicateOf: first};
    }
    firstByCanonical.set(canonical, index + 1);
    return annotated;
  });
}

/**
 * @brief Scores results by term match and freshness, then sorts.
 *
 * @param results Search results.
 * @param query Original query.
 * @return Results with `rank`, `score`, and `scoreSignals`.
 */
export function rankResults(
  results: readonly SearchResult[],
  query: string,
): SearchResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return results
    .map((result, index) => {
      const haystack =
        `${result.title} ${result.snippet} ${result.url}`.toLowerCase();
      const termMatches = terms.filter(term => haystack.includes(term)).length;
      const freshness = result.publishedAt
        ? Math.max(
            0,
            1 - (Date.now() - Date.parse(result.publishedAt)) / 604800000,
          )
        : 0;
      const score = Number(
        (
          (termMatches / Math.max(terms.length, 1)) * 0.7 +
          freshness * 0.3 -
          (result.duplicate ? 0.05 : 0)
        ).toFixed(4),
      );
      const scoreSignals: ScoreSignals = {
        termMatches,
        freshness,
        duplicate: Boolean(result.duplicate),
      };
      return {...result, rank: index + 1, score, scoreSignals};
    })
    .sort(
      (a, b) =>
        (b.score ?? 0) - (a.score ?? 0) || (a.rank ?? 0) - (b.rank ?? 0),
    )
    .map((result, index) => ({...result, rank: index + 1}));
}

/**
 * @brief Adds transparent quality labels to results.
 *
 * @param results Search results.
 * @return Results annotated with a `quality` label.
 */
export function labelQuality(results: readonly SearchResult[]): SearchResult[] {
  return results.map(result => {
    const host = (() => {
      try {
        return new URL(result.url).hostname.toLowerCase();
      } catch {
        return '';
      }
    })();
    const flags: string[] = [];
    if (/\.(zip|exe|scr|apk|msi)$/i.test(result.url)) {
      flags.push('download');
    }
    if (
      /free|download|claim|winner|urgent|login|verify/i.test(
        `${result.title} ${result.url}`,
      )
    ) {
      flags.push('attention');
    }
    if (host && /\.(tk|ml|ga|cf|gq)$/i.test(host)) {
      flags.push('suspicious-tld');
    }
    const quality: QualityLabel = {
      label: flags.length ? 'review' : 'normal',
      flags,
    };
    return {...result, quality};
  });
}

/**
 * @brief Searches the web with a chosen engine and applies ranking.
 *
 * @param query Search query.
 * @param options Engine and filtering options.
 * @return Ranked, deduplicated results.
 */
export async function search(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const engine = options.engine ?? DEFAULT_ENGINE;
  const noCache = options.noCache ?? false;
  const site = options.site ?? null;
  const scopedQuery = site ? `${query} site:${site}` : query;
  const limit = options.limit ?? DEFAULT_LIMIT;
  const tab = options.tab ?? 'web';
  const fresh = options.fresh ?? null;
  const keyObj = {engine, q: scopedQuery, limit, tab, fresh};
  const cached = cacheGet('search', keyObj, noCache);
  if (cached !== null) {
    return cached as SearchResult[];
  }
  const results = await runEngine(engine, scopedQuery, {
    limit,
    tab,
    fresh,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });
  const ranked = rankResults(annotateDuplicates(results), query);
  cacheSet('search', keyObj, ranked, noCache);
  return ranked;
}

/**
 * @brief Searches several queries concurrently, capturing per-query failures.
 *
 * @param queries Search queries.
 * @param options Shared search options.
 * @return One batch item per query.
 */
export async function searchBatch(
  queries: readonly string[],
  options: SearchOptions = {},
): Promise<BatchItem[]> {
  return Promise.all(
    queries.map(async query => {
      try {
        return {query, results: await search(query, options)};
      } catch (cause) {
        return {
          query,
          error: cause instanceof Error ? cause.message : String(cause),
        };
      }
    }),
  );
}

/**
 * @brief Searches multiple engines and groups corroborated sources.
 *
 * @param query Search query.
 * @param options Search options plus an `engines` override.
 * @return Per-engine outcomes and corroboration groups.
 */
export async function multiSourceSearch(
  query: string,
  options: SearchOptions & {engines?: readonly SearchEngine[]} = {},
): Promise<MultiSourceResult> {
  const engines = options.engines ?? DEFAULT_ENGINES;
  const outcomes: EngineOutcome[] = await Promise.all(
    engines.map(async engine => {
      try {
        return {engine, results: await search(query, {...options, engine})};
      } catch (cause) {
        return {
          engine,
          results: [],
          error: cause instanceof Error ? cause.message : String(cause),
        };
      }
    }),
  );
  const byCanonical = new Map<
    string,
    {canonicalUrl: string; sources: string[]; results: SearchResult[]}
  >();
  for (const outcome of outcomes) {
    for (const result of outcome.results) {
      const key = result.canonicalUrl ?? canonicalUrl(result.url);
      const group = byCanonical.get(key) ?? {
        canonicalUrl: key,
        sources: [],
        results: [],
      };
      group.sources.push(outcome.engine);
      group.results.push({...result, sourceEngine: outcome.engine});
      byCanonical.set(key, group);
    }
  }
  const groups = [...byCanonical.values()];
  return {
    query,
    engines: outcomes,
    corroborated: groups.filter(group => new Set(group.sources).size > 1),
    allGroups: groups,
  };
}

/**
 * @brief Searches and reads excerpts from the top results.
 *
 * @param query Search query.
 * @param topN Number of results to read.
 * @param excerptLength Maximum characters per excerpt.
 * @param options Search options.
 * @return A brief with one item per read result.
 */
export async function summarize(
  query: string,
  topN = 3,
  excerptLength = 800,
  options: SearchOptions = {},
): Promise<SearchBrief> {
  const count = Math.max(1, topN);
  const results = await search(query, {
    ...options,
    limit: Math.max(count, options.limit ?? 0),
  });
  const items = await Promise.all(
    results.slice(0, count).map(async result => {
      try {
        const page = await fetchPage(
          result.url,
          Math.max(excerptLength, 500),
          options.noCache ?? false,
        );
        return {
          title: page.title || result.title,
          url: result.url,
          excerpt: page.text.slice(0, excerptLength),
        };
      } catch (cause) {
        return {
          title: result.title,
          url: result.url,
          excerpt: result.snippet,
          error: cause instanceof Error ? cause.message : String(cause),
        };
      }
    }),
  );
  return {query, items};
}

/**
 * @brief Verifies result freshness from fetched page text.
 *
 * @param results Search results.
 * @param maxResults Maximum results to verify.
 * @param noCache Skip the page cache.
 * @return Results annotated with freshness findings.
 */
export async function verifyFreshness(
  results: readonly SearchResult[],
  maxResults = results.length,
  noCache = false,
): Promise<VerifiedResult[]> {
  const checked: VerifiedResult[] = await Promise.all(
    results.slice(0, maxResults).map(async result => {
      try {
        const page = await fetchPage(result.url, 5000, noCache);
        const matches =
          page.text.match(
            /\b(?:20\d{2})[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}\b/gi,
          ) ?? [];
        return {
          ...result,
          freshnessVerified: matches.length > 0,
          pageDateCandidates: [...new Set(matches)].slice(0, 10),
          fetchedAt: new Date().toISOString(),
        };
      } catch (cause) {
        return {
          ...result,
          freshnessVerified: false,
          pageDateCandidates: [],
          freshnessError:
            cause instanceof Error ? cause.message : String(cause),
          fetchedAt: new Date().toISOString(),
        };
      }
    }),
  );
  const remaining: VerifiedResult[] = results
    .slice(maxResults)
    .map(result => ({...result}));
  return [...checked, ...remaining];
}

/**
 * @brief Verifies source metadata from fetched pages.
 *
 * @param results Search results.
 * @param maxResults Maximum results to verify.
 * @param timeoutMs Request timeout in milliseconds.
 * @return Results annotated with source verification.
 */
export async function verifySources(
  results: readonly SearchResult[],
  maxResults = results.length,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<VerifiedResult[]> {
  const checked: VerifiedResult[] = await Promise.all(
    results.slice(0, maxResults).map(async result => {
      try {
        const page = await fetchDocument(result.url, {timeoutMs});
        const raw = await fetch(result.url, {redirect: 'follow'});
        const html = await raw.text();
        const canonical =
          /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i.exec(
            html,
          )?.[1] ?? null;
        const published =
          /(?:datePublished|article:published_time|dateCreated)["'=:>\s]+["']?([^"'<>\s]+)/i.exec(
            html,
          )?.[1] ?? null;
        const modified =
          /(?:dateModified|article:modified_time)["'=:>\s]+["']?([^"'<>\s]+)/i.exec(
            html,
          )?.[1] ?? null;
        return {
          ...result,
          sourceVerification: {
            status:
              canonical || published || modified ? 'verified' : 'unverified',
            canonicalUrl: canonical,
            datePublished: published,
            dateModified: modified,
            fetchedAt: new Date().toISOString(),
          },
          pageTitle: page.title,
        };
      } catch (cause) {
        return {
          ...result,
          sourceVerification: {
            status: 'error',
            error: cause instanceof Error ? cause.message : String(cause),
            fetchedAt: new Date().toISOString(),
          },
        };
      }
    }),
  );
  const remaining: VerifiedResult[] = results
    .slice(maxResults)
    .map(result => ({...result}));
  return [...checked, ...remaining];
}

/** File backing saved research records. */
export function researchFile(): string {
  return join(homedir(), '.agent-toolkit-research.jsonl');
}

/**
 * @brief Appends a research record without overwriting prior records.
 *
 * @param record Record fields to save.
 * @param file Target file, defaulting to the workspace file.
 * @return The stored record including generated `id` and `savedAt`.
 */
export function saveResearch(
  record: Record<string, unknown>,
  file = researchFile(),
): ResearchRecord {
  const item: ResearchRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    savedAt: new Date().toISOString(),
    ...record,
  };
  appendFileSync(file, `${JSON.stringify(item)}\n`, 'utf8');
  return item;
}

/**
 * @brief Reads saved research records in append order.
 *
 * @param file Source file, defaulting to the workspace file.
 * @return Stored records.
 */
export function listResearch(file = researchFile()): ResearchRecord[] {
  try {
    return readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => JSON.parse(line) as ResearchRecord);
  } catch (cause) {
    if ((cause as {code?: string}).code === 'ENOENT') {
      return [];
    }
    throw cause;
  }
}

/**
 * @brief Checks whether a value is a supported search tab.
 *
 * @param value Candidate value.
 * @return True when `value` is a search tab.
 */
export function isSearchTab(value: unknown): value is SearchTab {
  return (
    value === 'web' ||
    value === 'news' ||
    value === 'images' ||
    value === 'videos'
  );
}

/**
 * @brief Checks whether a value is a supported engine.
 *
 * @param value Candidate value.
 * @return True when `value` is a search engine.
 */
export function isSearchEngine(value: unknown): value is SearchEngine {
  return value === 'google' || value === 'duckduckgo' || value === 'google-api';
}

/**
 * @brief Checks whether a value is a supported freshness window.
 *
 * @param value Candidate value.
 * @return True when `value` is a freshness window.
 */
export function isFreshnessWindow(value: unknown): value is FreshnessWindow {
  return (
    value === 'hour' || value === 'day' || value === 'week' || value === 'month'
  );
}
