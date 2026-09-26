/**
 * @fileoverview Types for web search, fetch, and research tools.
 */

import type {JsonValue} from './common.js';

/** Search engine identifier. */
export type SearchEngine = 'google' | 'duckduckgo' | 'google-api';

/** HTTP method accepted by the generic request helper. */
export type RequestMethod =
  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/** Google result tab. */
export type SearchTab = 'web' | 'news' | 'images' | 'videos';

/** Freshness window accepted by Google. */
export type FreshnessWindow = 'hour' | 'day' | 'week' | 'month';

/** A single search result. */
export interface SearchResult {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
  readonly canonicalUrl?: string;
  readonly duplicate?: boolean;
  readonly duplicateOf?: number;
  readonly rank?: number;
  readonly score?: number;
  readonly scoreSignals?: ScoreSignals;
  readonly source?: string;
  readonly publishedAt?: string;
  readonly age?: string;
  readonly thumbnail?: string;
  readonly sourceEngine?: string;
  readonly quality?: QualityLabel;
}

/** Ranking signals attached to a scored result. */
export interface ScoreSignals {
  readonly termMatches: number;
  readonly freshness: number;
  readonly duplicate: boolean;
}

/** Transparent quality labelling applied to a result. */
export interface QualityLabel {
  readonly label: 'normal' | 'review';
  readonly flags: readonly string[];
}

/** A result enriched by freshness or source verification. */
export interface VerifiedResult extends SearchResult {
  readonly freshnessVerified?: boolean;
  readonly pageDateCandidates?: readonly string[];
  readonly freshnessError?: string;
  readonly sourceVerification?: SourceVerification;
  readonly pageTitle?: string;
  readonly fetchedAt?: string;
}

/** Source metadata verified from a fetched page. */
export interface SourceVerification {
  readonly status: 'verified' | 'unverified' | 'error';
  readonly canonicalUrl?: string | null;
  readonly datePublished?: string | null;
  readonly dateModified?: string | null;
  readonly error?: string;
  readonly fetchedAt: string;
}

/** Options accepted by the search dispatcher. */
export interface SearchOptions {
  readonly engine?: SearchEngine;
  readonly limit?: number;
  readonly timeoutMs?: number;
  readonly tab?: SearchTab;
  readonly fresh?: FreshnessWindow | null;
  readonly site?: string | null;
  readonly noCache?: boolean;
}

/** Extracted readable page content. */
export interface PageContent {
  readonly url: string;
  readonly status: number;
  readonly title: string;
  readonly text: string;
  readonly markdown: string;
  readonly contentType?: string;
  readonly bytes?: number;
}

/** Options accepted by {@link crawlDocumentation}. */
export interface CrawlOptions {
  /** Link-following depth; `1` reads only the entry page. */
  readonly depth?: number;
  /** Maximum pages to read across all depths. */
  readonly maxPages?: number;
  /** Restrict followed pages to the entry URL's origin. */
  readonly sameOrigin?: boolean;
  /** Maximum characters of Markdown per page. */
  readonly maxLength?: number;
  /** Request timeout per page in milliseconds. */
  readonly timeoutMs?: number;
  /** Skip the page cache. */
  readonly noCache?: boolean;
}

/** One page read during a crawl. */
export interface CrawlPage {
  readonly url: string;
  readonly depth: number;
  readonly title: string;
  readonly markdown: string;
}

/** A page that could not be read during a crawl. */
export interface CrawlError {
  readonly url: string;
  readonly depth: number;
  readonly error: string;
}

/** Result of crawling a documentation entry point. */
export interface CrawlResult {
  readonly root: string;
  readonly depth: number;
  readonly pages: readonly CrawlPage[];
  readonly errors: readonly CrawlError[];
  readonly visited: number;
  readonly truncated: boolean;
  readonly fetchedAt: string;
}

/** Options accepted by {@link requestUrl}. */
export interface RequestOptions {
  /** HTTP method; defaults to `GET`. */
  readonly method?: RequestMethod;
  /** Request headers. */
  readonly headers?: Readonly<Record<string, string>>;
  /** Request body, sent as-is. */
  readonly body?: string;
  /** Request timeout in milliseconds. */
  readonly timeoutMs?: number;
  /** Follow redirects; defaults to `true`. */
  readonly redirect?: boolean;
  /** Skip the disk cache. */
  readonly noCache?: boolean;
}

/** A generic HTTP response with its body rendered. */
export interface RequestResult {
  readonly url: string;
  readonly status: number;
  readonly statusText: string;
  readonly ok: boolean;
  readonly headers: Readonly<Record<string, string>>;
  readonly contentType: string;
  readonly bytes: number;
  readonly json?: JsonValue;
  readonly text?: string;
  readonly error?: string;
  readonly fetchedAt: string;
}

/** Result of reading a sitemap. */
export interface SitemapResult {
  readonly sitemap: string;
  readonly urls: readonly string[];
  readonly count: number;
  readonly fetchedAt: string;
}

/** Result of one query inside a batch. */
export interface BatchItem {
  readonly query: string;
  readonly results?: readonly SearchResult[];
  readonly error?: string;
}

/** A short brief produced by the summary tool. */
export interface SearchBrief {
  readonly query: string;
  readonly items: readonly BriefItem[];
}

/** One entry of a search brief. */
export interface BriefItem {
  readonly title: string;
  readonly url: string;
  readonly excerpt: string;
  readonly error?: string;
}

/** Corroboration group across engines. */
export interface CorroborationGroup {
  readonly canonicalUrl: string;
  readonly sources: readonly string[];
  readonly results: readonly SearchResult[];
}

/** Output of a multi-source search. */
export interface MultiSourceResult {
  readonly query: string;
  readonly engines: readonly EngineOutcome[];
  readonly corroborated: readonly CorroborationGroup[];
  readonly allGroups: readonly CorroborationGroup[];
}

/** Per-engine outcome inside a multi-source search. */
export interface EngineOutcome {
  readonly engine: string;
  readonly results: readonly SearchResult[];
  readonly error?: string;
}

/** A saved research record. */
export interface ResearchRecord extends Record<string, unknown> {
  readonly id: string;
  readonly savedAt: string;
}
