/**
 * @fileoverview Generic HTTP request helper for API calls from tools.
 */

import type {JsonValue} from '../types/common.js';
import type {
  RequestMethod,
  RequestOptions,
  RequestResult,
} from '../types/web.js';
import {
  DEFAULT_TIMEOUT_MS,
  assertPublicUrl,
  cacheGet,
  cacheSet,
  USER_AGENT,
} from './web-core.js';

/** HTTP methods accepted by {@link requestUrl}. */
export const REQUEST_METHODS: readonly RequestMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

/** Default cap on the body characters returned. */
export const DEFAULT_REQUEST_MAX_LENGTH = 20000;

/**
 * @brief Performs a generic HTTP request and renders the response.
 *
 * Parses `application/json` responses into `json`; other bodies are returned
 * as `text` unless the body is empty. Non-2xx responses are not thrown; the
 * caller inspects `ok` and `status`.
 *
 * @param url Absolute HTTP(S) URL.
 * @param options Method, headers, body, redirect, and timeout options.
 * @param maxLength Maximum characters of the rendered body; defaults to
 *   {@link DEFAULT_REQUEST_MAX_LENGTH}.
 * @return The response with headers and a rendered body.
 * @throws Error When the URL is not an absolute, public HTTP(S) URL.
 */
export async function requestUrl(
  url: string,
  options: RequestOptions = {},
  maxLength = DEFAULT_REQUEST_MAX_LENGTH,
): Promise<RequestResult> {
  const target = assertPublicUrl(url);
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: '*/*',
    ...options.headers,
  };
  const noBody = method === 'GET' || method === 'HEAD';
  const cacheable = noBody && options.body === undefined;
  const key = {
    url: target,
    method,
    headers,
    redirect: options.redirect ?? true,
    maxLength,
  };
  if (cacheable) {
    const cached = cacheGet('request', key, options.noCache ?? false);
    if (cached !== null) {
      return cached as RequestResult;
    }
  }
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  try {
    const response = await fetch(target, {
      method,
      headers,
      signal: controller.signal,
      redirect: (options.redirect ?? true) ? 'follow' : 'manual',
      ...(options.body === undefined ? {} : {body: options.body}),
    });
    const headerMap: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      headerMap[name] = value;
    });
    const contentType = response.headers.get('content-type') ?? '';
    const buffer = Buffer.from(await response.arrayBuffer());
    const body = renderBody(buffer, contentType, maxLength);
    const result: RequestResult = {
      url: response.url || target,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: headerMap,
      contentType,
      bytes: buffer.length,
      ...(body.json === undefined ? {} : {json: body.json}),
      ...(body.text === undefined ? {} : {text: body.text}),
      ...(body.error === undefined ? {} : {error: body.error}),
      fetchedAt: new Date().toISOString(),
    };
    if (cacheable) {
      cacheSet('request', key, result, options.noCache ?? false);
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @brief Renders a response body as JSON or text.
 *
 * @param buffer Raw response bytes.
 * @param contentType Response content type.
 * @param maxLength Maximum characters to keep.
 * @return Either a `json` value, a `text` string, or an `error`.
 */
function renderBody(
  buffer: Buffer,
  contentType: string,
  maxLength: number,
): {json?: JsonValue; text?: string; error?: string} {
  if (buffer.length === 0) {
    return {};
  }
  const text = buffer.toString('utf8');
  if (/json/i.test(contentType)) {
    try {
      return {json: JSON.parse(text) as JsonValue};
    } catch (cause) {
      return {
        error: cause instanceof Error ? cause.message : String(cause),
        text: text.slice(0, maxLength),
      };
    }
  }
  return {text: text.slice(0, maxLength)};
}
