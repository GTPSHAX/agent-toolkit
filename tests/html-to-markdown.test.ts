/**
 * @fileoverview Unit tests for HTML-to-Markdown conversion and link extraction.
 */

import {describe, expect, it} from 'vitest';

import {htmlToMarkdown} from '../src/utils/html-to-markdown.js';
import {extractLinks} from '../src/utils/web-crawl.js';

describe('htmlToMarkdown', () => {
  it('renders headings, paragraphs, and inline emphasis', () => {
    const md = htmlToMarkdown(
      '<h1>Title</h1><p>Hello <strong>bold</strong> and <em>italics</em>.</p>',
    );
    expect(md).toContain('# Title');
    expect(md).toContain('Hello **bold** and *italics*.');
  });

  it('drops scripts, styles, and navigation', () => {
    const md = htmlToMarkdown(
      '<nav>menu</nav><script>bad()</script><style>.x{}</style><p>Keep</p>',
    );
    expect(md).not.toContain('menu');
    expect(md).not.toContain('bad()');
    expect(md).not.toContain('.x{}');
    expect(md).toBe('Keep');
  });

  it('resolves relative links against the base URL', () => {
    const md = htmlToMarkdown('<p>See <a href="/guide/intro">Intro</a>.</p>', {
      baseUrl: 'https://example.com/docs/page',
    });
    expect(md).toContain('[Intro](https://example.com/guide/intro)');
  });

  it('keeps fragments as plain text links', () => {
    const md = htmlToMarkdown('<p><a href="#section">Jump</a></p>', {
      baseUrl: 'https://example.com/docs',
    });
    expect(md).toBe('Jump');
  });

  it('renders ordered and nested lists', () => {
    const md = htmlToMarkdown(
      '<ol><li>One</li><li>Two<ul><li>Nested</li></ul></li></ol>',
    );
    expect(md).toContain('1. One');
    expect(md).toContain('2. Two');
    expect(md).toContain('- Nested');
  });

  it('renders fenced code blocks and inline code', () => {
    const md = htmlToMarkdown(
      '<p>Use <code>npm i</code>.</p><pre>const a = 1;</pre>',
    );
    expect(md).toContain('Use `npm i`.');
    expect(md).toContain('```\nconst a = 1;\n```');
  });

  it('renders tables with a separator row', () => {
    const md = htmlToMarkdown(
      '<table><tr><th>Name</th><th>Value</th></tr>' +
        '<tr><td>a</td><td>1</td></tr></table>',
    );
    expect(md).toContain('| Name | Value |');
    expect(md).toContain('| --- | --- |');
    expect(md).toContain('| a | 1 |');
  });

  it('decodes entities and trims excessive blank lines', () => {
    const md = htmlToMarkdown('<p>a &amp; b</p>\n\n\n<p>c</p>');
    expect(md).toContain('a & b');
    expect(md).not.toContain('\n\n\n');
  });
});

describe('extractLinks', () => {
  const base = 'https://docs.example.com/start';

  it('resolves, canonicalizes, and de-duplicates anchor links', () => {
    const html =
      '<a href="/a?utm_source=x">A</a>' +
      '<a href="/a">A again</a>' +
      '<a href="b">B</a>';
    expect(extractLinks(html, base)).toEqual([
      'https://docs.example.com/a',
      'https://docs.example.com/b',
    ]);
  });

  it('skips fragments, mail links, and javascript URLs', () => {
    const html =
      '<a href="#top">top</a>' +
      '<a href="mailto:x@y.z">mail</a>' +
      '<a href="javascript:void(0)">js</a>' +
      '<a href="https://docs.example.com/ok">ok</a>';
    expect(extractLinks(html, base)).toEqual(['https://docs.example.com/ok']);
  });

  it('reads Markdown links produced by the converter', () => {
    const markdown = 'See [Guide](/guide) and [API](/api#v2).';
    expect(extractLinks(markdown, base)).toEqual([
      'https://docs.example.com/guide',
      'https://docs.example.com/api',
    ]);
  });
});
