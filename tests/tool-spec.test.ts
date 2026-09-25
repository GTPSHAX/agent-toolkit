/**
 * @fileoverview Unit tests for the CLI tool catalog and spec rendering.
 */

import {describe, expect, it} from 'vitest';

import {defaultTools} from '../src/index.js';
import {createRegistry, listTools} from '../src/tools/index.js';
import {exampleFromSchema, formatToolSpec} from '../src/utils/tool-spec.js';
import type {ToolInfo} from '../src/types/tools.js';

/** Tool catalog used across the assertions. */
const tools = listTools(createRegistry(defaultTools()));

/**
 * @brief Looks up a tool by name in the catalog.
 *
 * @param name Tool name.
 * @return The tool summary.
 */
function tool(name: string): ToolInfo {
  const found = tools.find(candidate => candidate.name === name);
  if (!found) {
    throw new Error(`missing tool ${name}`);
  }
  return found;
}

describe('exampleFromSchema', () => {
  it('fills every declared property', () => {
    const example = exampleFromSchema(tool('hash').inputSchema) as Record<
      string,
      unknown
    >;
    expect(Object.keys(example).sort()).toEqual(['algorithm', 'text']);
  });

  it('prefers the first enum value for choices', () => {
    const example = exampleFromSchema(tool('uuid').inputSchema) as Record<
      string,
      unknown
    >;
    expect(example['action']).toBe('generate');
  });

  it('uses a type-appropriate placeholder for unknown names', () => {
    expect(
      exampleFromSchema({
        type: 'object',
        properties: {flag: {type: 'boolean'}, list: {type: 'array'}},
      }),
    ).toEqual({flag: true, list: []});
  });
});

describe('formatToolSpec', () => {
  it('lists parameters, required markers, and an example call', () => {
    const spec = formatToolSpec(tool('uuid'));
    expect(spec).toContain('action <string> (required)');
    expect(spec).toContain('count <number> (optional)');
    expect(spec).toContain('Example arguments');
    expect(spec).toContain('agent-toolkit run uuid');
    expect(spec).toContain('Output schema');
  });

  it('renders every registered tool without throwing', () => {
    for (const entry of tools) {
      expect(formatToolSpec(entry).length).toBeGreaterThan(0);
    }
  });
});

describe('tool catalog', () => {
  it('contains at least the built-in echo tool', () => {
    expect(tools.some(entry => entry.name === 'echo')).toBe(true);
  });

  it('exposes input schemas for every tool', () => {
    for (const entry of tools) {
      expect(entry.inputSchema.type).toBe('object');
    }
  });
});
