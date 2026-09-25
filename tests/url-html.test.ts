/**
 * @fileoverview Unit tests for the URL and HTML helpers and tools.
 */

import {describe, expect, it} from 'vitest';

import {createRegistry, executeTool} from '../src/tools/index.js';
import {htmlTool, urlTool} from '../src/tools/url-html.js';
import {
  htmlDecode,
  htmlEncode,
  urlDecode,
  urlEncode,
} from '../src/utils/url-html.js';

describe('url', () => {
  it('encodes components', () => {
    expect(urlEncode('hello world & more')).toBe('hello%20world%20%26%20more');
    expect(urlEncode('a/b?c=d')).toBe('a%2Fb%3Fc%3Dd');
  });

  it('keeps reserved characters when encoding a whole URL', () => {
    expect(urlEncode('https://x.test/a b?c=d&e=f', true)).toBe(
      'https://x.test/a%20b?c=d&e=f',
    );
  });

  it('round-trips components', () => {
    expect(urlDecode(urlEncode('a👍 b'))).toBe('a👍 b');
  });

  it('rejects malformed escapes', () => {
    expect(() => urlDecode('%E0%A4%A')).toThrow();
  });
});

describe('html', () => {
  it('encodes significant characters', () => {
    expect(htmlEncode('<a href="x">&\'')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;',
    );
  });

  it('decodes named, decimal, and hex entities', () => {
    expect(htmlDecode('&lt;p&gt;&amp;&#39;&#x1F44D;')).toBe("<p>&'\u{1F44D}");
  });

  it('decodes nbsp', () => {
    expect(htmlDecode('a&nbsp;b')).toBe('a\u00a0b');
  });

  it('leaves unknown entities untouched', () => {
    expect(htmlDecode('&unknown;')).toBe('&unknown;');
  });

  it('round-trips significant characters', () => {
    const text = '<a href="x">&\'';
    expect(htmlDecode(htmlEncode(text))).toBe(text);
  });
});

describe('url and html tools', () => {
  it('url encodes', async () => {
    const registry = createRegistry([urlTool()]);
    const output = await executeTool(registry, 'url', {
      text: 'a b',
      mode: 'encode',
    });
    expect(output.structuredContent).toMatchObject({text: 'a%20b'});
  });

  it('html decodes', async () => {
    const registry = createRegistry([htmlTool()]);
    const output = await executeTool(registry, 'html', {
      text: '&amp;',
      mode: 'decode',
    });
    expect(output.structuredContent).toMatchObject({text: '&'});
  });

  it('url reports malformed escapes as an error', async () => {
    const registry = createRegistry([urlTool()]);
    const output = await executeTool(registry, 'url', {
      text: '%E0%A4%A',
      mode: 'decode',
    });
    expect(output.isError).toBe(true);
  });
});
