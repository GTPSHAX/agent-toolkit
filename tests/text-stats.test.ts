/**
 * @fileoverview Unit tests for the text statistics helper and tool.
 */

import {describe, expect, it} from 'vitest';

import {computeTextStats} from '../src/utils/text-stats.js';
import {createRegistry, executeTool} from '../src/tools/index.js';
import {textStatsTool} from '../src/tools/text-stats.js';

describe('computeTextStats', () => {
  it('counts characters, words, and lines', () => {
    const stats = computeTextStats('Hello world\nSecond line');
    expect(stats.characters).toBe(23);
    expect(stats.words).toBe(4);
    expect(stats.lines).toBe(2);
  });

  it('counts sentences terminated by punctuation', () => {
    const stats = computeTextStats('One. Two! Three?');
    expect(stats.sentences).toBe(3);
  });

  it('counts a trailing fragment as a sentence', () => {
    const stats = computeTextStats('One. Two');
    expect(stats.sentences).toBe(2);
  });

  it('counts unique words case-insensitively', () => {
    const stats = computeTextStats('Hello hello HeLLo world');
    expect(stats.uniqueWords).toBe(2);
  });

  it('finds the longest word', () => {
    const stats = computeTextStats('a bb ccc');
    expect(stats.longestWord).toBe('ccc');
  });

  it('excludes whitespace from charactersNoSpaces', () => {
    const stats = computeTextStats('a b\nc');
    expect(stats.charactersNoSpaces).toBe(3);
  });

  it('handles empty input', () => {
    const stats = computeTextStats('');
    expect(stats).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
      sentences: 0,
      uniqueWords: 0,
      longestWord: '',
    });
  });

  it('counts unicode code points rather than UTF-16 units', () => {
    const stats = computeTextStats('a👍b');
    expect(stats.characters).toBe(3);
  });
});

describe('text.stats tool', () => {
  it('returns statistics in structuredContent', async () => {
    const registry = createRegistry([textStatsTool()]);
    const output = await executeTool(registry, 'text.stats', {
      text: 'Hello world',
    });
    expect(output.isError).toBe(false);
    expect(output.structuredContent).toMatchObject({words: 2});
  });

  it('fails when text is missing', async () => {
    const registry = createRegistry([textStatsTool()]);
    const output = await executeTool(registry, 'text.stats', {});
    expect(output.isError).toBe(true);
  });
});
