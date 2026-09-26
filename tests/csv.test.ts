/**
 * @fileoverview Unit tests for CSV parsing and serialization.
 */

import {describe, expect, it} from 'vitest';

import {parseCsv, stringifyCsv} from '../src/utils/csv.js';
import {csvTool} from '../src/tools/csv.js';
import {createRegistry, executeTool} from '../src/tools/index.js';

describe('parseCsv', () => {
  it('parses a header and rows', () => {
    const table = parseCsv('name,age\nAda,36\nAlan,41\n');
    expect(table.columns).toEqual(['name', 'age']);
    expect(table.rowCount).toBe(2);
    expect(table.rows[0]).toEqual({name: 'Ada', age: '36'});
    expect(table.rows[1]?.['name']).toBe('Alan');
  });

  it('handles quoted fields, escaped quotes, and embedded newlines', () => {
    const table = parseCsv('a,b\n"x,1","line\nbreak"\n"say ""hi"""\n');
    expect(table.rows[0]).toEqual({a: 'x,1', b: 'line\nbreak'});
    expect(table.rows[1]?.['a']).toBe('say "hi"');
  });

  it('supports TSV and headerless input with generated columns', () => {
    const table = parseCsv('1\t2\n3\t4', {
      delimiter: '\t',
      header: false,
    });
    expect(table.columns).toEqual(['col1', 'col2']);
    expect(table.rows[1]).toEqual({col1: '3', col2: '4'});
  });

  it('fills blank and duplicate header names', () => {
    const table = parseCsv('a,,a\n1,2,3');
    expect(table.columns).toEqual(['a', 'col2', 'a_2']);
  });

  it('drops empty lines when requested', () => {
    expect(parseCsv('a\n1\n\n').rowCount).toBe(1);
    expect(parseCsv('a\n1\n\n', {skipEmptyLines: false}).rowCount).toBe(2);
  });
});

describe('stringifyCsv', () => {
  it('serializes objects with a header', () => {
    const text = stringifyCsv([
      {name: 'Ada', age: '36'},
      {name: 'Alan', age: '41'},
    ]);
    expect(text).toBe('name,age\nAda,36\nAlan,41');
  });

  it('honours explicit columns and skips the header when asked', () => {
    const text = stringifyCsv([{a: '1', b: '2'}], {
      columns: ['b', 'a'],
      header: false,
    });
    expect(text).toBe('2,1');
  });

  it('quotes fields with delimiters, quotes, or newlines', () => {
    const text = stringifyCsv([{a: 'x,1', b: 'say "hi"'}]);
    expect(text).toBe('a,b\n"x,1","say ""hi"""');
  });

  it('rejects non-array and mixed input', () => {
    expect(() => stringifyCsv({a: 1})).toThrow();
    expect(() => stringifyCsv([{a: 1}, [1, 2]])).toThrow();
  });
});

describe('csv tool', () => {
  it('round-trips through parse and stringify', async () => {
    const registry = createRegistry([csvTool()]);
    const parsed = await executeTool(registry, 'csv', {
      mode: 'parse',
      text: 'a,b\n1,2',
    });
    expect(parsed.isError).toBe(false);
    const table = parsed.structuredContent as {table: {rows: unknown[]}};
    expect(table.table.rows).toHaveLength(1);

    const text = await executeTool(registry, 'csv', {
      mode: 'stringify',
      data: [{a: '1', b: '2'}],
    });
    expect(text.structuredContent).toMatchObject({text: 'a,b\n1,2'});
  });

  it('accepts the tab alias and rejects a bad mode', async () => {
    const registry = createRegistry([csvTool()]);
    const tsv = await executeTool(registry, 'csv', {
      mode: 'stringify',
      data: [['1', '2']],
      delimiter: 'tab',
    });
    expect(tsv.structuredContent).toMatchObject({delimiter: '\t'});
    const bad = await executeTool(registry, 'csv', {mode: 'x'});
    expect(bad.isError).toBe(true);
  });
});
