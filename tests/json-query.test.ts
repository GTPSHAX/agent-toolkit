/**
 * @fileoverview Unit tests for JSON path evaluation and the json.query tool.
 */

import {describe, expect, it} from 'vitest';

import {createRegistry, executeTool} from '../src/tools/index.js';
import {jsonQueryTool} from '../src/tools/json-query.js';
import {parsePath, queryJson} from '../src/utils/json-query.js';

const document = {
  data: {
    items: [
      {id: 1, name: 'First', tags: ['a', 'b']},
      {id: 2, name: 'Second', tags: []},
    ],
    total: 2,
  },
};

describe('queryJson', () => {
  it('selects a nested value and renders its path', () => {
    const result = queryJson(document, 'data.total');
    expect(result.count).toBe(1);
    expect(result.value).toBe(2);
    expect(result.matches[0]?.path).toBe('$.data.total');
  });

  it('iterates every array element with []', () => {
    const result = queryJson(document, 'data.items[].name');
    expect(result.matches.map(entry => entry.value)).toEqual([
      'First',
      'Second',
    ]);
    expect(result.matches[1]?.path).toBe('$.data.items[1].name');
  });

  it('selects an array element by index, including negatives', () => {
    expect(queryJson(document, 'data.items[0].id').value).toBe(1);
    expect(queryJson(document, 'data.items[-1].id').value).toBe(2);
    expect(queryJson(document, 'data.items[9]').count).toBe(0);
  });

  it('expands object keys with the wildcard', () => {
    const result = queryJson({a: 1, b: 2}, '*');
    expect(result.count).toBe(2);
    expect(result.matches.map(entry => entry.path).sort()).toEqual([
      '$.a',
      '$.b',
    ]);
  });

  it('accepts a leading $ or . and returns no matches for missing keys', () => {
    expect(queryJson(document, '$.data.total').value).toBe(2);
    expect(queryJson(document, '.data.total').value).toBe(2);
    expect(queryJson(document, 'data.missing').count).toBe(0);
  });

  it('reports malformed paths instead of throwing', () => {
    const result = queryJson(document, 'data..');
    expect(result.count).toBe(0);
    expect(result.error).toBeDefined();
  });
});

describe('parsePath', () => {
  it('parses keys, indexes, iteration, and wildcards', () => {
    expect(parsePath('$.a[0].b[]')).toEqual([
      {kind: 'key', key: 'a'},
      {kind: 'index', index: 0},
      {kind: 'key', key: 'b'},
      {kind: 'iterate'},
    ]);
    expect(parsePath('*')).toEqual([{kind: 'wildcard'}]);
  });
});

describe('json.query tool', () => {
  it('fails without json or query', async () => {
    const registry = createRegistry([jsonQueryTool()]);
    const output = await executeTool(registry, 'json.query', {query: 'a'});
    expect(output.isError).toBe(true);
  });

  it('fails on invalid JSON', async () => {
    const registry = createRegistry([jsonQueryTool()]);
    const output = await executeTool(registry, 'json.query', {
      json: '{oops',
      query: 'a',
    });
    expect(output.isError).toBe(true);
  });

  it('returns matches as structured content', async () => {
    const registry = createRegistry([jsonQueryTool()]);
    const output = await executeTool(registry, 'json.query', {
      json: JSON.stringify(document),
      query: 'data.items[].id',
    });
    expect(output.isError).toBe(false);
    expect(output.structuredContent).toMatchObject({count: 2});
  });
});
