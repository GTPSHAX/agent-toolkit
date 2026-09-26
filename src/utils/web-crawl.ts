/**
 * @fileoverview Breadth-first documentation crawler built on {@link fetchDocument}.
 */

import type {
  CrawlError,
  CrawlOptions,
  CrawlPage,
  CrawlResult,
  PageContent,
} from '../types/web.js';
import {canonicalUrl} from './web-core.js';
import {readHtmlAttribute} from './html-to-markdown.js';
import {fetchDocument} from './web-fetch.js';

/** Default link-following depth. */
export const DEFAULT_CRAWL_DEPTH = 1;

/** Upper bound on link-following depth. */
export const MAX_CRAWL_DEPTH = 5;

/** Default maximum pages read across all depths. */
export const DEFAULT_MAX_PAGES = 25;

/** Upper bound on the number of pages read in one crawl. */
export const MAX_CRAWL_PAGES = 100;

/** Default maximum characters of Markdown per page. */
export const DEFAULT_CRAWL_MAX_LENGTH = 20000;

/**
 * @brief Extracts same-document links from HTML or Markdown.
 *
 * Recognizes both raw `<a href>` tags and Markdown `[text](url)` links. The
 * URL fragment is dropped and URLs are canonicalized before de-duplication.
 *
 * @param content Raw HTML or Markdown document.
 * @param baseUrl Base URL used to resolve relative and fragment links.
 * @return Absolute, de-duplicated link URLs in document order.
 */
export function extractLinks(content: string, baseUrl: string): string[] {
  const order: string[] = [];
  const seen = new Set<string>();

  /**
   * @brief Records one candidate link.
   *
   * @param raw Raw URL.
   */
  function add(raw: string): void {
    const href = raw.trim();
    if (href.length === 0 || href.startsWith('#')) {
      return;
    }
    if (/^(?:mailto:|javascript:|tel:|data:)/i.test(href)) {
      return;
    }
    const resolved = absoluteUrl(href, baseUrl);
    if (resolved === null) {
      return;
    }
    const parsed = new URL(resolved);
    parsed.hash = '';
    const link = canonicalUrl(parsed.toString());
    if (link.length === 0 || seen.has(link)) {
      return;
    }
    seen.add(link);
    order.push(link);
  }

  const anchorRe = /<a\b((?:"[^"]*"|'[^']*'|[^>"'])*)>/gi;
  let anchor: RegExpExecArray | null;
  while ((anchor = anchorRe.exec(content)) !== null) {
    const href = readHtmlAttribute(anchor[1] ?? '', 'href');
    if (href !== undefined) {
      add(href);
    }
  }

  const markdownRe =
    /(?<!!)\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
  let link: RegExpExecArray | null;
  while ((link = markdownRe.exec(content)) !== null) {
    const target = (link[1] ?? '').replace(/^<(.*)>$/, '$1');
    add(target);
  }

  return order;
}

/**
 * @brief Crawls a page and its linked pages up to a depth.
 *
 * Reads the entry page, then follows in-content links breadth-first until the
 * depth or page limit is reached. Pages are read through {@link fetchDocument}
 * so each entry carries Markdown.
 *
 * @param url Absolute HTTP(S) entry URL.
 * @param options Depth, page limit, origin scope, and length limits.
 * @return Pages, per-URL errors, and crawl metadata.
 * @throws Error When `url` is not an absolute HTTP(S) URL.
 */
export async function crawlDocumentation(
  url: string,
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  const root = absoluteUrl(url);
  if (root === null) {
    throw new Error(`url must be absolute (got: ${url})`);
  }
  const depth = clamp(options.depth ?? DEFAULT_CRAWL_DEPTH, 1, MAX_CRAWL_DEPTH);
  const maxPages = clamp(
    options.maxPages ?? DEFAULT_MAX_PAGES,
    1,
    MAX_CRAWL_PAGES,
  );
  const maxLength = Math.max(options.maxLength ?? DEFAULT_CRAWL_MAX_LENGTH, 0);
  const sameOrigin = options.sameOrigin ?? true;
  const origin = new URL(root).origin;
  const queued = new Map<string, number>([[root, 0]]);
  const visited = new Set<string>();
  const pages: CrawlPage[] = [];
  const errors: CrawlError[] = [];
  let truncated = false;

  while (queued.size > 0) {
    const next = queued.entries().next();
    if (next.done) {
      break;
    }
    const [current, currentDepth] = next.value;
    queued.delete(current);
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    let page: PageContent;
    try {
      page = await fetchDocument(current, {
        maxLength,
        ...(options.timeoutMs === undefined
          ? {}
          : {timeoutMs: options.timeoutMs}),
      });
    } catch (cause) {
      errors.push({
        url: current,
        depth: currentDepth,
        error: cause instanceof Error ? cause.message : String(cause),
      });
      continue;
    }
    pages.push({
      url: page.url,
      depth: currentDepth,
      title: page.title,
      markdown: page.markdown,
    });
    if (pages.length >= maxPages) {
      truncated = true;
      break;
    }
    if (currentDepth >= depth) {
      continue;
    }
    for (const link of extractLinks(page.markdown, page.url)) {
      if (visited.has(link) || queued.has(link)) {
        continue;
      }
      if (sameOrigin && new URL(link).origin !== origin) {
        continue;
      }
      if (queued.size + visited.size >= maxPages) {
        truncated = true;
        break;
      }
      queued.set(link, currentDepth + 1);
    }
  }

  return {
    root,
    depth,
    pages,
    errors,
    visited: visited.size,
    truncated,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * @brief Resolves a URL against an optional base.
 *
 * @param value Absolute or relative URL.
 * @param base Optional base URL.
 * @return Normalized absolute URL, or `null` when it cannot be resolved.
 */
function absoluteUrl(value: string, base?: string): string | null {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

/**
 * @brief Clamps a number into an inclusive range.
 *
 * @param value Requested value.
 * @param min Lower bound.
 * @param max Upper bound.
 * @return Clamped integer.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
