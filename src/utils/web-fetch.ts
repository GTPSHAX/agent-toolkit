/**
 * @fileoverview Page, document, and sitemap fetching helpers.
 */

import {Buffer} from 'node:buffer';
import {inflateSync} from 'node:zlib';

import type {FetchFormat, PageContent, SitemapResult} from '../types/web.js';
import {
  DEFAULT_TIMEOUT_MS,
  assertPublicUrl,
  cacheGet,
  cacheSet,
  decodeEntities,
  extractTitle,
  httpGet,
  htmlToText,
} from './web-core.js';
import {htmlToMarkdown} from './html-to-markdown.js';

/** Default maximum characters returned from a page. */
export const DEFAULT_MAX_LENGTH = 20000;

/** Default maximum PDF size in bytes. */
export const DEFAULT_MAX_PDF_BYTES = 25 * 1024 * 1024;

/**
 * @brief Fetches a web page and extracts readable text.
 *
 * @param url Absolute HTTP(S) URL.
 * @param maxLength Maximum characters to return.
 * @param noCache Skip the disk cache.
 * @param timeoutMs Request timeout in milliseconds.
 * @return Page content with title and text.
 * @throws Error When the URL or response is unusable.
 */
export async function fetchPage(
  url: string,
  maxLength = DEFAULT_MAX_LENGTH,
  noCache = false,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<PageContent> {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`url must start with http:// or https:// (got: ${url})`);
  }
  const keyObj = {url, maxLength};
  const cached = cacheGet('page', keyObj, noCache);
  if (cached !== null) {
    return cached as PageContent;
  }
  const response = await httpGet(url, timeoutMs);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!/text\/html|text\/plain|xhtml/i.test(contentType)) {
    throw new Error(`unsupported content-type "${contentType}"`);
  }
  const html = await response.text();
  const page: PageContent = {
    url: response.url,
    status: response.status,
    title: extractTitle(html),
    text: htmlToText(html).slice(0, maxLength),
    markdown: htmlToMarkdown(html, {baseUrl: response.url}).slice(0, maxLength),
    html: html.slice(0, maxLength),
  };
  cacheSet('page', keyObj, page, noCache);
  return page;
}

/**
 * @brief Selects the single-page body for a requested output format.
 *
 * @param page Fetched page content.
 * @param format Requested format.
 * @return The Markdown, plain-text, or raw HTML body.
 */
export function selectFetchBody(
  page: PageContent,
  format: FetchFormat,
): string {
  switch (format) {
    case 'text':
      return page.text;
    case 'html':
      return page.html;
    default:
      return page.markdown;
  }
}

/**
 * @brief Checks whether a value is a supported fetch format.
 *
 * @param value Candidate format.
 * @return True for `markdown`, `text`, or `html`.
 */
export function isFetchFormat(value: string | undefined): value is FetchFormat {
  return value === 'markdown' || value === 'text' || value === 'html';
}

/**
 * @brief Extracts text from a standard text-based PDF buffer.
 *
 * @param buffer Raw PDF bytes.
 * @return Extracted text.
 */
export function extractPdfText(buffer: Buffer): string {
  const source = buffer.toString('latin1');
  const chunks: string[] = [];
  const streamRe = /<<(.*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(source)) !== null) {
    let data = Buffer.from(match[2] ?? '', 'latin1');
    if (/\/FlateDecode/.test(match[1] ?? '')) {
      try {
        data = inflateSync(data);
      } catch {
        continue;
      }
    }
    const text = data.toString('latin1');
    if (!/\b(?:BT|Tj|TJ|Tf|Td|T\*)\b/.test(text)) {
      continue;
    }
    chunks.push(text);
  }

  const decodeLiteral = (value: string): string =>
    value
      .replace(/\\([\\()])/g, '$1')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\([0-7]{1,3})/g, (_, oct: string) =>
        String.fromCharCode(Number.parseInt(oct, 8)),
      );
  const decodeHex = (value: string): string => {
    const hex = value
      .replace(/\s/g, '')
      .padEnd(value.length % 2 ? value.length + 1 : value.length, '0');
    return Buffer.from(hex, 'hex').toString('latin1');
  };

  const lines: string[] = [];
  for (const stream of chunks) {
    const ops = /\(((?:\\.|[^\\)])*)\)\s*Tj|\[((?:.|\n)*?)\]\s*TJ/g;
    let op: RegExpExecArray | null;
    while ((op = ops.exec(stream)) !== null) {
      if (op[1] !== undefined) {
        lines.push(decodeLiteral(op[1]));
      } else {
        const parts = [
          ...(op[2] ?? '').matchAll(
            /\(((?:\\.|[^\\)])*)\)|<([0-9a-fA-F\s]+)>/g,
          ),
        ];
        lines.push(
          parts
            .map(part =>
              part[1] !== undefined
                ? decodeLiteral(part[1])
                : decodeHex(part[2] ?? ''),
            )
            .join(''),
        );
      }
    }
  }
  return lines
    .map(line => keepPrintable(line).trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * @brief Keeps tab, line breaks, and printable characters.
 *
 * @param line Input line.
 * @return Filtered line.
 */
function keepPrintable(line: string): string {
  let output = '';
  for (const char of line) {
    const code = char.codePointAt(0) ?? 0;
    const printable =
      code === 0x09 ||
      code === 0x0a ||
      code === 0x0d ||
      (code >= 0x20 && code <= 0x7e) ||
      code >= 0xa0;
    if (printable) {
      output += char;
    }
  }
  return output;
}

/**
 * @brief Fetches HTML, plain text, or a PDF and returns readable content.
 *
 * @param url Absolute HTTP(S) URL.
 * @param options Output length and PDF size limits.
 * @return Page or document content.
 * @throws Error When the URL is private or the PDF is invalid or too large.
 */
export async function fetchDocument(
  url: string,
  options: {
    maxLength?: number;
    maxBytes?: number;
    timeoutMs?: number;
  } = {},
): Promise<PageContent> {
  assertPublicUrl(url);
  const response = await httpGet(url, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const type = response.headers.get('content-type') ?? '';
  if (!/pdf/i.test(type) && !/\.pdf(?:$|\?)/i.test(url)) {
    return fetchPage(
      url,
      options.maxLength ?? DEFAULT_MAX_LENGTH,
      false,
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_PDF_BYTES;
  if (bytes.length > maxBytes) {
    throw new Error(`PDF exceeds ${maxBytes} bytes`);
  }
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('response is not a valid PDF');
  }
  return {
    url: response.url,
    status: response.status,
    title: '',
    text: extractPdfText(bytes).slice(
      0,
      options.maxLength ?? DEFAULT_MAX_LENGTH,
    ),
    markdown: '',
    html: '',
    contentType: type || 'application/pdf',
    bytes: bytes.length,
  };
}

/**
 * @brief Fetches a sitemap and returns its URLs.
 *
 * @param url Absolute sitemap URL.
 * @param timeoutMs Request timeout in milliseconds.
 * @return Sitemap URL list in document order.
 * @throws Error When the URL is private or the request fails.
 */
export async function crawlSitemap(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<SitemapResult> {
  assertPublicUrl(url);
  const response = await httpGet(url, timeoutMs);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc[^>]*>\s*([\s\S]*?)\s*<\/loc>/gi)].map(
    match => decodeEntities((match[1] ?? '').trim()),
  );
  const unique = [...new Set(urls)];
  return {
    sitemap: response.url,
    urls: unique,
    count: unique.length,
    fetchedAt: new Date().toISOString(),
  };
}
