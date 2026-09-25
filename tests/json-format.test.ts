/**
 * @fileoverview Unit tests for the JSON formatter helper and tool.
 */

import {describe, expect, it} from 'vitest';

import {createRegistry, executeTool} from '../src/tools/index.js';
import {jsonFormatTool} from '../src/tools/json-format.js';
import {formatJson} from '../src/utils/json.js';

describe('formatJson', () => {
  it('pretty-prints with the default indent', () => {
    const result = formatJson('{"a":1}');
    expect(result.valid).toBe(true);
    expect(result.text).toBe('{\n  "a": 1\n}');
  });

  it('compacts output when indent is zero', () => {
    const result = formatJson('{ "a": 1, "b": 2 }', {indent: 0});
    expect(result.text).toBe('{"a":1,"b":2}');
  });

  it('sorts object keys recursively', () => {
    const result = formatJson('{"b":1,"a":{"d":2,"c":3}}', {
      indent: 0,
      sortKeys: true,
    });
    expect(result.text).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it('preserves array order when sorting keys', () => {
    const result = formatJson('[{"b":1,"a":2}]', {
      indent: 0,
      sortKeys: true,
    });
    expect(result.text).toBe('[{"a":2,"b":1}]');
  });

  it('clamps indentation to the supported maximum', () => {
    const result = formatJson('{"a":1}', {indent: 999});
    expect(result.text).toContain('\n          "a"');
  });

  it('reports invalid JSON', () => {
    const result = formatJson('{oops}');
    expect(result.valid).toBe(false);
    expect(result.text).toBe('{oops}');
    expect(result.error).toBeTypeOf('string');
  });
});

describe('json.format tool', () => {
  it('returns formatted text in structuredContent', async () => {
    const registry = createRegistry([jsonFormatTool()]);
    const output = await executeTool(registry, 'json.format', {
      json: '{"a":1}',
      indent: 0,
    });
    expect(output.isError).toBe(false);
    expect(output.structuredContent).toMatchObject({text: '{"a":1}'});
  });

  it('fails on invalid JSON', async () => {
    const registry = createRegistry([jsonFormatTool()]);
    const output = await executeTool(registry, 'json.format', {json: '{oops}'});
    expect(output.isError).toBe(true);
  });

  it('fails when json is missing', async () => {
    const registry = createRegistry([jsonFormatTool()]);
    const output = await executeTool(registry, 'json.format', {});
    expect(output.isError).toBe(true);
  });
});
