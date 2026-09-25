/**
 * @fileoverview Search engine implementations.
 */

import {spawn} from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import type {
  FreshnessWindow,
  SearchEngine,
  SearchResult,
  SearchTab,
} from '../types/web.js';
import {
  DEFAULT_TIMEOUT_MS,
  USER_AGENT,
  cleanSpaces,
  decodeEntities,
  httpGet,
} from './web-core.js';

/** Candidate Chromium browser executables, first match wins. */
const BROWSER_CANDIDATES: readonly string[] = [
  process.env['CHROME_PATH'] ?? '',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium',
].filter(Boolean);

/** Maximum concurrent Google renders. */
export const MAX_CONCURRENT_RENDERS = 3;

/** Freshness windows accepted by Google. */
export const FRESHNESS_MAP: Readonly<Record<FreshnessWindow, string>> = {
  hour: 'h',
  day: 'd',
  week: 'w',
  month: 'm',
};

/**
 * @brief Locates a Chromium-based browser executable.
 *
 * @return Absolute path to the browser.
 * @throws Error When no supported browser is installed.
 */
export function findBrowser(): string {
  for (const candidate of BROWSER_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    'no Chrome/Edge found; install Chrome/Edge or set CHROME_PATH',
  );
}

/** Whether a Chromium browser is available. */
export function isBrowserAvailable(): boolean {
  try {
    findBrowser();
    return true;
  } catch {
    return false;
  }
}

/**
 * @brief Searches DuckDuckGo's HTML endpoint.
 *
 * @param query Search query.
 * @param limit Maximum results.
 * @param timeoutMs Request timeout in milliseconds.
 * @return Parsed results.
 * @throws Error When the request fails.
 */
export async function duckDuckGoSearch(
  query: string,
  limit = 8,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<SearchResult[]> {
  const params = new URLSearchParams({q: query, kp: '1'});
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: params.toString(),
    });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new Error(`DuckDuckGo returned HTTP ${response.status}`);
  }
  return parseDuckDuckGoResults(await response.text(), limit);
}

/**
 * @brief Parses a DuckDuckGo HTML results page.
 *
 * @param html Page HTML.
 * @param limit Maximum results.
 * @return Parsed results.
 */
function parseDuckDuckGoResults(html: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];
  const blockRe =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]*?)(?=<a[^>]*class="[^"]*result__a|<\/body>|$)/g;
  let match: RegExpExecArray | null;
  while (results.length < limit && (match = blockRe.exec(html)) !== null) {
    const [, rawHref, titleHtml, rest] = match;
    let url = decodeEntities(rawHref ?? '');
    if (/duckduckgo\.com\/y\.js\?ad_domain/i.test(url)) {
      continue;
    }
    const uddg = /(?:[?&])uddg=([^&]+)/.exec(url);
    if (uddg?.[1]) {
      url = decodeURIComponent(uddg[1]);
    }
    if (!/^https?:\/\//i.test(url)) {
      continue;
    }
    const title = cleanSpaces(
      decodeEntities((titleHtml ?? '').replace(/<[^>]+>/g, '')),
    );
    if (!title) {
      continue;
    }
    const snippetMatch =
      /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/.exec(rest ?? '');
    const snippet = snippetMatch?.[1]
      ? cleanSpaces(decodeEntities(snippetMatch[1].replace(/<[^>]+>/g, '')))
      : '';
    results.push({title, url, snippet});
  }
  return results;
}

/**
 * @brief Renders a URL with a headless Chromium browser and returns the DOM.
 *
 * @param url URL to render.
 * @param timeoutMs Render timeout in milliseconds.
 * @return Rendered HTML.
 * @throws Error When the browser fails or produces no output.
 */
export function renderWithBrowser(
  url: string,
  timeoutMs: number,
): Promise<string> {
  const browser = findBrowser();
  const profileDir = mkdtempSync(join(tmpdir(), 'agent-toolkit-chrome-'));
  const virtualBudget = Math.min(Math.max(timeoutMs, 4000), 12000);
  const args = [
    '--headless',
    '--disable-gpu',
    '--no-first-run',
    '--no-sandbox',
    '--disable-extensions',
    '--disable-component-update',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-translate',
    '--no-default-browser-check',
    '--user-agent=' + USER_AGENT,
    `--user-data-dir=${profileDir}`,
    `--virtual-time-budget=${virtualBudget}`,
    '--dump-dom',
    url,
  ];
  return new Promise<string>((resolve, reject) => {
    const child = spawn(browser, args, {stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`headless browser timed out after ${timeoutMs}ms`));
    }, timeoutMs + 10000);
    child.stdout.on(
      'data',
      (data: Buffer) => (stdout += data.toString('utf8')),
    );
    child.stderr.on(
      'data',
      (data: Buffer) => (stderr += data.toString('utf8')),
    );
    child.on('error', error => {
      clearTimeout(timer);
      reject(new Error(`failed to launch browser: ${error.message}`));
    });
    child.on('close', code => {
      clearTimeout(timer);
      rmSync(profileDir, {recursive: true, force: true});
      if (!stdout.trim()) {
        reject(
          new Error(
            `browser produced no output (exit ${code}): ${stderr.slice(0, 200)}`,
          ),
        );
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * @brief Resolves a Google `/goto?url=` token to the real target URL.
 *
 * @param token Redirect token.
 * @param timeoutMs Request timeout in milliseconds.
 * @return Real URL, or `null` when it cannot be resolved.
 */
export async function resolveGotoToken(
  token: string,
  timeoutMs: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://www.google.com/goto?url=${token}`, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {'User-Agent': USER_AGENT, Accept: 'text/html,*/*;q=0.8'},
    });
    const location = response.headers.get('location');
    return location && /^https?:\/\//i.test(location) ? location : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @brief Searches google.com via a headless browser, without an API key.
 *
 * @param query Search query.
 * @param options Limit, tab, freshness, and timeout.
 * @return Parsed results.
 * @throws Error When rendering fails or Google blocks the request.
 */
export async function googleSearch(
  query: string,
  options: {
    limit?: number;
    timeoutMs?: number;
    tab?: SearchTab;
    fresh?: FreshnessWindow | null;
  } = {},
): Promise<SearchResult[]> {
  const limit = options.limit ?? 8;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const tab = options.tab ?? 'web';
  const fresh = options.fresh ?? null;
  const unlimited = limit <= 0;
  const maxResults = unlimited ? 100 : limit;
  const all: SearchResult[] = [];
  const seen = new Set<string>();
  let sawCaptcha = false;

  for (let page = 0; all.length < maxResults && page < 10; page++) {
    const params = new URLSearchParams({q: query, hl: 'en'});
    if (tab === 'web') {
      params.set('udm', '14');
      params.set('num', '10');
      params.set('start', String(page * 10));
    } else if (tab === 'videos') {
      params.set('tbm', 'vid');
      params.set('start', String(page * 10));
    } else if (tab === 'news') {
      params.set('tbm', 'nws');
      params.set('start', String(page * 10));
    } else {
      params.set('tbm', 'isch');
    }
    if (fresh) {
      params.set('tbs', `qdr:${FRESHNESS_MAP[fresh]}`);
    }

    let parsed: SearchResult[] = [];
    for (let attempt = 0; attempt <= 1 && parsed.length === 0; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      const html = await renderWithBrowser(
        `https://www.google.com/search?${params}`,
        timeoutMs,
      );
      sawCaptcha =
        sawCaptcha || /captcha-form|g-recaptcha|unusual traffic/i.test(html);
      parsed =
        tab === 'news'
          ? parseGoogleNews(html, 10)
          : tab === 'images'
            ? parseGoogleImages(html, maxResults)
            : parseGoogleResults(html, 10);
    }
    if (parsed.length === 0) {
      break;
    }

    const resolved = await Promise.all(
      parsed.map(result =>
        result.url.includes('/goto?url=')
          ? resolveGotoToken(result.url.split('url=')[1] ?? '', timeoutMs)
          : Promise.resolve(result.url),
      ),
    );

    let freshCount = 0;
    parsed.forEach((result, index) => {
      const url = resolved[index] ?? result.url;
      if (!seen.has(url)) {
        seen.add(url);
        all.push({...result, url});
        freshCount++;
      }
    });
    if (freshCount === 0) {
      break;
    }
    if (tab === 'images') {
      break;
    }
    if (!unlimited && all.length >= limit) {
      break;
    }
  }

  if (all.length === 0) {
    throw new Error(
      sawCaptcha
        ? 'Google served a CAPTCHA (too many searches from this IP; wait and retry)'
        : 'no results parsed (Google markup may have changed, or the page rendered empty)',
    );
  }
  return unlimited ? all : all.slice(0, limit);
}

/**
 * @brief Parses rendered Google web results.
 *
 * @param html Rendered page HTML.
 * @param limit Maximum results.
 * @return Parsed results.
 */
function parseGoogleResults(html: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];
  const anchorRe =
    /<a[^>]*jsname="UWckNb"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRe = /class="[^"]*\bVwiC3b\b[^"]*"[^>]*>([\s\S]*?)<\/div>/;
  let match: RegExpExecArray | null;
  while (results.length < limit && (match = anchorRe.exec(html)) !== null) {
    const [, href, inner] = match;
    if (!(inner ?? '').includes('<h3')) {
      continue;
    }
    const h3 = /<h3[^>]*>([\s\S]*?)<\/h3>/.exec(inner ?? '');
    const title = cleanSpaces(
      decodeEntities(
        (h3?.[1] ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ''),
      ),
    );
    if (!title) {
      continue;
    }
    const url = decodeEntities(href ?? '');
    if (!/^https?:\/\//i.test(url) && !url.includes('/goto?url=')) {
      continue;
    }
    const after = html.slice(anchorRe.lastIndex, anchorRe.lastIndex + 3000);
    const snippetMatch = snippetRe.exec(after);
    const snippet = snippetMatch?.[1]
      ? cleanSpaces(
          decodeEntities(
            snippetMatch[1]
              .replace(/<!--[\s\S]*?-->/g, '')
              .replace(/<[^>]+>/g, ''),
          ),
        )
      : '';
    results.push({title, url, snippet});
  }
  return results;
}

/**
 * @brief Parses a rendered Google news tab page.
 *
 * @param html Rendered page HTML.
 * @param limit Maximum results.
 * @return Parsed results.
 */
function parseGoogleNews(html: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];
  const anchorRe =
    /<a[^>]*jsname="YKoRaf"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null;
  while (results.length < limit && (match = anchorRe.exec(html)) !== null) {
    const [, href, inner] = match;
    const titleMatch = /<div class="n0jPhd[^"]*"[^>]*>([^<]+)<\/div>/.exec(
      inner ?? '',
    );
    const title = titleMatch?.[1]
      ? cleanSpaces(decodeEntities(titleMatch[1]))
      : '';
    if (!title) {
      continue;
    }
    const pubMatch =
      /<div class="MgUUmf\b[^"]*"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/.exec(
        inner ?? '',
      );
    const source = pubMatch?.[1]
      ? cleanSpaces(decodeEntities(pubMatch[1]))
      : '';
    const snipMatch = /<div class="UqSP2b[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(
      inner ?? '',
    );
    const snippet = snipMatch?.[1]
      ? cleanSpaces(decodeEntities(snipMatch[1].replace(/<[^>]+>/g, '')))
      : '';
    const tsMatch = /<span data-ts="(\d+)"[^>]*>([^<]*)<\/span>/.exec(
      inner ?? '',
    );
    const publishedAt = tsMatch?.[1]
      ? new Date(Number(tsMatch[1]) * 1000).toISOString()
      : undefined;
    const age = tsMatch?.[2]?.trim();
    const url = decodeEntities(href ?? '');
    if (!/^https?:\/\//i.test(url) && !url.includes('/goto?url=')) {
      continue;
    }
    results.push({
      title,
      url,
      snippet,
      ...(source ? {source} : {}),
      ...(publishedAt ? {publishedAt} : {}),
      ...(age ? {age} : {}),
    });
  }
  return results;
}

/**
 * @brief Parses a rendered Google images tab page.
 *
 * @param html Rendered page HTML.
 * @param limit Maximum results.
 * @return Parsed results.
 */
function parseGoogleImages(html: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];
  const blockRe = /data-lpage="([^"]+)"([\s\S]*?)(?=data-lpage="|$)/g;
  let match: RegExpExecArray | null;
  while (results.length < limit && (match = blockRe.exec(html)) !== null) {
    const [, pageUrl = '', block = ''] = match;
    if (!/^https?:\/\//i.test(pageUrl)) {
      continue;
    }
    const imageMatch =
      /<img[^>]*alt="([^"]+)"[^>]*src="([^"]+)"/.exec(block) ??
      /<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/.exec(block);
    if (!imageMatch) {
      continue;
    }
    const alt = (imageMatch[1] ?? '').startsWith('http')
      ? imageMatch[2]
      : imageMatch[1];
    const src = (imageMatch[1] ?? '').startsWith('http')
      ? imageMatch[1]
      : imageMatch[2];
    if (!src || src.startsWith('data:')) {
      continue;
    }
    const title = cleanSpaces(decodeEntities(alt ?? ''));
    if (!title) {
      continue;
    }
    results.push({
      title,
      url: decodeEntities(pageUrl),
      snippet: '',
      thumbnail: decodeEntities(src),
    });
  }
  return results;
}

/**
 * @brief Searches Google via the official Custom Search JSON API.
 *
 * @param query Search query.
 * @param options Limit, timeout, and credentials.
 * @return Parsed results.
 * @throws Error When credentials are missing or the request fails.
 */
export async function googleSearchApi(
  query: string,
  options: {
    limit?: number;
    timeoutMs?: number;
    apiKey?: string;
    cx?: string;
  } = {},
): Promise<SearchResult[]> {
  const limit = options.limit ?? 8;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const apiKey = options.apiKey ?? process.env['GOOGLE_API_KEY'];
  const cx = options.cx ?? process.env['GOOGLE_CX'];
  if (!apiKey) {
    throw new Error('missing API key; set GOOGLE_API_KEY or pass apiKey');
  }
  if (!cx) {
    throw new Error('missing search engine ID; set GOOGLE_CX or pass cx');
  }
  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    num: String(Math.min(Math.max(limit, 1), 10)),
    safe: 'active',
  });
  const response = await httpGet(
    `https://www.googleapis.com/customsearch/v1?${params}`,
    timeoutMs,
  );
  const data = (await response.json().catch(() => null)) as {
    items?: {title?: string; link?: string; snippet?: string}[];
    error?: {message?: string};
  } | null;
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `HTTP ${response.status}`);
  }
  return (data?.items ?? []).slice(0, limit).map(item => ({
    title: item.title ?? '',
    url: item.link ?? '',
    snippet: cleanSpaces(item.snippet ?? ''),
  }));
}

/**
 * @brief Fetches Google autocomplete suggestions.
 *
 * @param query Partial query.
 * @param timeoutMs Request timeout in milliseconds.
 * @return Suggestion strings.
 * @throws Error When the request fails or returns an unexpected shape.
 */
export async function googleSuggest(
  query: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<string[]> {
  const params = new URLSearchParams({client: 'firefox', q: query});
  const response = await httpGet(
    `https://suggestqueries.google.com/complete/search?${params}`,
    timeoutMs,
  );
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = (await response.json().catch(() => null)) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[1])) {
    throw new Error('unexpected response format');
  }
  return (data[1] as unknown[]).filter(
    (item): item is string => typeof item === 'string',
  );
}

/**
 * @brief Dispatches a search to the requested engine.
 *
 * @param engine Engine identifier.
 * @param query Search query.
 * @param options Engine options.
 * @return Engine results.
 * @throws Error When the engine is unknown.
 */
export async function runEngine(
  engine: SearchEngine,
  query: string,
  options: {
    limit?: number;
    timeoutMs?: number;
    tab?: SearchTab;
    fresh?: FreshnessWindow | null;
  },
): Promise<SearchResult[]> {
  switch (engine) {
    case 'duckduckgo':
      return duckDuckGoSearch(
        query,
        options.limit ?? 8,
        options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      );
    case 'google':
      return googleSearch(query, options);
    case 'google-api':
      return googleSearchApi(query, options);
    default:
      throw new Error(`unknown engine "${String(engine)}"`);
  }
}

/** Write helper kept for profile cleanup parity. */
export function writeProfileMarker(path: string, value: string): void {
  writeFileSync(path, value, {flag: 'wx'});
}

/** Read helper kept for profile cleanup parity. */
export function readProfileMarker(path: string): string {
  return readFileSync(path, 'utf8');
}
