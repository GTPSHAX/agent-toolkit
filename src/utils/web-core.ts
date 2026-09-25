/**
 * @fileoverview Shared low-level helpers for web tools.
 */

import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {isIP} from 'node:net';

/** Default request timeout in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 15000;

/** Default disk cache lifetime in milliseconds. */
export const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

/** Browser user agent used for all requests. */
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * @brief Performs a GET request with a timeout and browser-like headers.
 *
 * @param url Absolute URL to request.
 * @param timeoutMs Request timeout in milliseconds.
 * @return The fetch response.
 */
export async function httpGet(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Decodable HTML entity names. */
const ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

/**
 * @brief Decodes numeric and common named HTML entities.
 *
 * @param text Input text.
 * @return Text with entities replaced.
 */
export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(
      /&(amp|lt|gt|quot|#39|#x27|apos|nbsp);/g,
      match => ENTITIES[match] ?? match,
    );
}

/**
 * @brief Collapses whitespace runs and trims the result.
 *
 * @param text Input text.
 * @return Single-line text.
 */
export function cleanSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * @brief Converts an HTML document into readable text.
 *
 * @param html Raw HTML.
 * @return Plain text with block-level line breaks preserved.
 */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, ' ')
      .replace(
        /<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article|\/header|\/footer|\/blockquote)\b[^>]*>/gi,
        '\n',
      )
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map(line => cleanSpaces(line))
    .filter(
      (line, index, all) =>
        line.length > 0 || (index > 0 && (all[index - 1]?.length ?? 0) > 0),
    )
    .join('\n')
    .trim();
}

/**
 * @brief Extracts the contents of a document's `title` element.
 *
 * @param html Raw HTML.
 * @return Decoded, trimmed title, or an empty string.
 */
export function extractTitle(html: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match
    ? cleanSpaces(decodeEntities((match[1] ?? '').replace(/<[^>]+>/g, '')))
    : '';
}

/**
 * @brief Normalizes tracking-only URL differences.
 *
 * @param url Absolute URL.
 * @return URL without known tracking parameters, fragments, or trailing slash.
 */
export function canonicalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (
        /^(utm_|gclid$|fbclid$|dclid$|msclkid$|mc_cid$|mc_eid$|ref$|referrer$)/i.test(
          key,
        )
      ) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hash = '';
    if (parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname.replace(/\/$/, '');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * @brief Rejects non-public HTTP(S) URLs.
 *
 * @param value Candidate URL.
 * @return The normalized URL.
 * @throws Error When the URL is not absolute, not HTTP(S), or private.
 */
export function assertPublicUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('URL must be absolute');
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error('Only http:// and https:// URLs are allowed');
  }
  const host = parsed.hostname.toLowerCase();
  const ip = isIP(host);
  const privateIp =
    ip === 4 &&
    (host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host));
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '::1' ||
    privateIp
  ) {
    throw new Error('Private/internal URLs are not allowed');
  }
  return parsed.toString();
}

/** Directory backing the on-disk cache. */
function cacheDir(): string {
  const dir = join(tmpdir(), 'agent-toolkit-web-cache');
  mkdirSync(dir, {recursive: true});
  return dir;
}

/**
 * @brief Builds a stable cache file name for a key object.
 *
 * @param obj Serializable key parts.
 * @return Cache file name.
 */
function cacheKey(obj: unknown): string {
  return createHash('sha1').update(JSON.stringify(obj)).digest('hex') + '.json';
}

/**
 * @brief Reads a cached value.
 *
 * @param namespace Cache bucket name.
 * @param keyObj Stable key parts.
 * @param noCache Skip the cache entirely.
 * @param ttlMs Cache lifetime; defaults to {@link DEFAULT_CACHE_TTL_MS}.
 * @return The cached value, or `null` on miss or expiry.
 */
export function cacheGet(
  namespace: string,
  keyObj: Record<string, unknown>,
  noCache = false,
  ttlMs = 0,
): unknown {
  if (noCache) {
    return null;
  }
  const file = join(cacheDir(), `${namespace}-${cacheKey(keyObj)}`);
  try {
    const entry = JSON.parse(readFileSync(file, 'utf8')) as {
      time: number;
      value: unknown;
    };
    const ttl = ttlMs > 0 ? ttlMs : DEFAULT_CACHE_TTL_MS;
    if (Date.now() - entry.time > ttl) {
      rmSync(file, {force: true});
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

/**
 * @brief Writes a value to the cache, ignoring failures.
 *
 * @param namespace Cache bucket name.
 * @param keyObj Stable key parts.
 * @param value Value to store.
 * @param noCache Skip the cache entirely.
 */
export function cacheSet(
  namespace: string,
  keyObj: Record<string, unknown>,
  value: unknown,
  noCache = false,
): void {
  if (noCache) {
    return;
  }
  try {
    const file = join(cacheDir(), `${namespace}-${cacheKey(keyObj)}`);
    writeFileSync(file, JSON.stringify({time: Date.now(), value}));
  } catch {
    // Cache writes are best-effort.
  }
}
