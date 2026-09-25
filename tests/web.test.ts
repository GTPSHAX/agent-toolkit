/**
 * @fileoverview Unit tests for web helpers that do not touch the network.
 */

import {describe, expect, it} from 'vitest';

import {createRegistry, executeTool} from '../src/tools/index.js';
import {
  webFetchTool,
  webResearchTool,
  webSearchTool,
} from '../src/tools/web.js';
import {
  assertPublicUrl,
  canonicalUrl,
  cleanSpaces,
  decodeEntities,
  extractTitle,
  htmlToText,
} from '../src/utils/web-core.js';
import {
  annotateDuplicates,
  labelQuality,
  rankResults,
} from '../src/utils/web-search.js';

describe('decodeEntities', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('a &amp; b &lt; c')).toBe('a & b < c');
    expect(decodeEntities('&#65;&#x42;')).toBe('AB');
  });
});

describe('htmlToText', () => {
  it('drops scripts and keeps block breaks', () => {
    const html = '<h1>Title</h1><script>bad()</script><p>One</p><p>Two</p>';
    const text = htmlToText(html);
    expect(text).not.toContain('bad()');
    expect(text).toContain('Title');
    expect(text.split('\n')).toContain('One');
  });
});

describe('extractTitle', () => {
  it('extracts and cleans the title', () => {
    expect(extractTitle('<title>  Hello &amp; bye </title>')).toBe(
      'Hello & bye',
    );
    expect(extractTitle('<html></html>')).toBe('');
  });
});

describe('cleanSpaces', () => {
  it('collapses whitespace', () => {
    expect(cleanSpaces('  a\n\n b\t c ')).toBe('a b c');
  });
});

describe('canonicalUrl', () => {
  it('strips tracking parameters, hash, and trailing slash', () => {
    expect(
      canonicalUrl('https://x.test/a/?utm_source=n&gclid=1&b=2#frag'),
    ).toBe('https://x.test/a?b=2');
  });

  it('returns the input when unparsable', () => {
    expect(canonicalUrl('not a url')).toBe('not a url');
  });
});

describe('assertPublicUrl', () => {
  it('accepts public HTTP(S) URLs', () => {
    expect(assertPublicUrl('https://example.com/a')).toBe(
      'https://example.com/a',
    );
  });

  it('rejects private and non-HTTP URLs', () => {
    expect(() => assertPublicUrl('http://localhost/x')).toThrow();
    expect(() => assertPublicUrl('http://127.0.0.1/x')).toThrow();
    expect(() => assertPublicUrl('http://192.168.1.1/x')).toThrow();
    expect(() => assertPublicUrl('file:///etc/passwd')).toThrow();
    expect(() => assertPublicUrl('relative/path')).toThrow();
  });
});

describe('annotateDuplicates', () => {
  it('marks later duplicates without removing them', () => {
    const results = [
      {title: 'a', url: 'https://x.test/1', snippet: ''},
      {title: 'b', url: 'https://x.test/1/?utm_source=z', snippet: ''},
    ];
    const annotated = annotateDuplicates(results);
    expect(annotated).toHaveLength(2);
    expect(annotated[0]?.duplicate).toBe(false);
    expect(annotated[1]?.duplicate).toBe(true);
    expect(annotated[1]?.duplicateOf).toBe(1);
  });
});

describe('rankResults', () => {
  it('ranks term matches above non-matches', () => {
    const results = [
      {title: 'other', url: 'https://x.test/2', snippet: ''},
      {title: 'nodejs release', url: 'https://x.test/1', snippet: ''},
    ];
    const ranked = rankResults(results, 'nodejs release');
    expect(ranked[0]?.title).toBe('nodejs release');
    expect(ranked[0]?.rank).toBe(1);
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 1);
  });
});

describe('labelQuality', () => {
  it('flags attention and suspicious domains', () => {
    const flagged = labelQuality([
      {title: 'free download winner', url: 'https://x.tk/a', snippet: ''},
      {title: 'docs', url: 'https://example.com/a', snippet: ''},
    ]);
    expect(flagged[0]?.quality?.label).toBe('review');
    expect(flagged[0]?.quality?.flags).toContain('attention');
    expect(flagged[0]?.quality?.flags).toContain('suspicious-tld');
    expect(flagged[1]?.quality?.label).toBe('normal');
  });
});

describe('web tool argument validation', () => {
  it('web.search fails without a query and before any request', async () => {
    const registry = createRegistry([webSearchTool()]);
    const output = await executeTool(registry, 'web.search', {});
    expect(output.isError).toBe(true);
  });

  it('web.fetch fails without a url', async () => {
    const registry = createRegistry([webFetchTool()]);
    const output = await executeTool(registry, 'web.fetch', {});
    expect(output.isError).toBe(true);
  });

  it('web.research lists records without arguments beyond the action', async () => {
    const registry = createRegistry([webResearchTool()]);
    const output = await executeTool(registry, 'web.research', {
      action: 'list',
    });
    expect(output.isError).toBe(false);
  });

  it('web.research rejects an unknown action', async () => {
    const registry = createRegistry([webResearchTool()]);
    const output = await executeTool(registry, 'web.research', {action: 'x'});
    expect(output.isError).toBe(true);
  });
});
