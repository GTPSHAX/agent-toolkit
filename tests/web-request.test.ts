/**
 * @fileoverview Unit tests for the generic HTTP request helper.
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

import {requestUrl} from '../src/utils/web-request.js';

/**
 * @brief Builds a Response-like stub for the fetch mock.
 *
 * @param body Response body text.
 * @param contentType Content type header.
 * @param status HTTP status.
 * @param statusText HTTP status text.
 * @return A minimal `Response`.
 */
function response(
  body: string,
  contentType: string,
  status = 200,
  statusText = 'OK',
): Response {
  return new Response(body, {
    status,
    statusText,
    headers: {'content-type': contentType},
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('requestUrl', () => {
  it('parses a JSON body and reports status and headers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response('{"ok":true}', 'application/json')),
    );
    const result = await requestUrl('https://api.example.com/v1', {
      noCache: true,
    });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.json).toEqual({ok: true});
    expect(result.contentType).toContain('application/json');
  });

  it('returns text for non-JSON content and keeps an error on bad JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response('hello', 'text/plain')),
    );
    const text = await requestUrl('https://api.example.com/t', {noCache: true});
    expect(text.text).toBe('hello');
    expect(text.json).toBeUndefined();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response('{oops', 'application/json')),
    );
    const bad = await requestUrl('https://api.example.com/bad', {
      noCache: true,
    });
    expect(bad.error).toBeDefined();
    expect(bad.text).toBe('{oops');
  });

  it('sends the method, headers, and body', async () => {
    const fetchMock = vi.fn(async () =>
      response('{}', 'application/json', 201, 'Created'),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await requestUrl('https://api.example.com/create', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: '{"a":1}',
      noCache: true,
    });
    expect(result.status).toBe(201);
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const init = call[1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
  });

  it('rejects private and non-HTTP URLs', async () => {
    await expect(requestUrl('http://localhost/x')).rejects.toThrow();
    await expect(requestUrl('file:///etc/passwd')).rejects.toThrow();
  });

  it('caches bodyless GET responses when not opted out', async () => {
    const fetchMock = vi.fn(async () =>
      response('{"n":1}', 'application/json'),
    );
    vi.stubGlobal('fetch', fetchMock);
    const url = `https://cache.example.com/${Date.now()}-${Math.random()}`;
    await requestUrl(url);
    await requestUrl(url);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
