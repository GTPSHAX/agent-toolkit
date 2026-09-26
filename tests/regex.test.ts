/**
 * @fileoverview Unit tests for the regular-expression helpers and tool.
 */

import {describe, expect, it} from 'vitest';

import {createRegistry, executeTool} from '../src/tools/index.js';
import {regexTool} from '../src/tools/regex.js';
import {applyRegex} from '../src/utils/regex.js';

describe('applyRegex match', () => {
  it('reports index and capture groups', () => {
    const result = applyRegex({
      pattern: '(\\w+)@(\\w+)\\.com',
      input: 'mail a@x.com and b@y.com',
    });
    expect(result.mode).toBe('match');
    expect(result.count).toBe(2);
    expect(result.matched).toBe(true);
    expect(result.matches?.[0]).toEqual({
      match: 'a@x.com',
      index: 5,
      groups: ['a', 'x'],
    });
    expect(result.matches?.[1]?.index).toBe(17);
  });

  it('exposes named groups and unmatched optionals', () => {
    const result = applyRegex({
      pattern: '(?<key>\\w+)=(?<value>\\w+)?',
      input: 'a=1 b=',
    });
    expect(result.matches?.[1]?.named).toEqual({key: 'b', value: undefined});
    expect(result.matches?.[1]?.groups[1]).toBeUndefined();
  });

  it('honours the limit option', () => {
    const result = applyRegex({pattern: 'a', input: 'aaaa', limit: 2});
    expect(result.matches).toHaveLength(2);
  });

  it('reports a bad pattern instead of throwing', () => {
    const result = applyRegex({pattern: '(', input: 'x'});
    expect(result.matched).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects unsupported flags', () => {
    const result = applyRegex({pattern: 'a', input: 'a', flags: 'z'});
    expect(result.error).toContain('unsupported flag');
  });
});

describe('applyRegex replace and split', () => {
  it('replaces with numbered and named captures', () => {
    const numbered = applyRegex({
      pattern: '(\\w+),(\\w+)',
      input: 'a,b',
      mode: 'replace',
      replacement: '$2 $1',
    });
    expect(numbered.replaced).toBe('b a');
    const named = applyRegex({
      pattern: '(?<first>\\w+)-(?<second>\\w+)',
      input: 'one-two',
      mode: 'replace',
      replacement: '$<second>/$<first>',
    });
    expect(named.replaced).toBe('two/one');
  });

  it('counts replacements across all matches', () => {
    const result = applyRegex({
      pattern: '\\d+',
      input: 'a1 b2 c3',
      mode: 'replace',
      replacement: '#',
    });
    expect(result.replaced).toBe('a# b# c#');
    expect(result.count).toBe(3);
  });

  it('splits on a pattern', () => {
    const result = applyRegex({
      pattern: '\\s*,\\s*',
      input: 'a, b,c',
      mode: 'split',
    });
    expect(result.parts).toEqual(['a', 'b', 'c']);
    expect(result.count).toBe(3);
  });
});

describe('regex tool', () => {
  it('fails without pattern or input', async () => {
    const registry = createRegistry([regexTool()]);
    const output = await executeTool(registry, 'regex', {pattern: 'a'});
    expect(output.isError).toBe(true);
  });

  it('returns matches as structured content', async () => {
    const registry = createRegistry([regexTool()]);
    const output = await executeTool(registry, 'regex', {
      pattern: '\\d+',
      input: 'x12 y34',
    });
    expect(output.isError).toBe(false);
    expect(output.structuredContent).toMatchObject({count: 2, matched: true});
  });
});
