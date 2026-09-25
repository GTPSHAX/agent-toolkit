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
  it('includes required properties and common optionals', () => {
    const example = exampleFromSchema(tool('hash').inputSchema) as Record<
      string,
      unknown
    >;
    expect(Object.keys(example).sort()).toEqual(['algorithm', 'text']);
    expect(example['algorithm']).toBe('sha256');
  });

  it('omits unrelated optional properties', () => {
    const example = exampleFromSchema(tool('web.search').inputSchema) as Record<
      string,
      unknown
    >;
    expect(Object.keys(example).sort()).toEqual(['limit', 'query']);
    expect(example['query']).toBe('nodejs release notes');
  });

  it('prefers the first enum value when the sample does not fit', () => {
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
        properties: {
          flag: {type: 'boolean'},
          list: {type: 'array'},
          note: {type: 'string'},
        },
        required: ['flag', 'list', 'note'],
      }),
    ).toEqual({flag: true, list: [], note: 'string'});
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

  it('exposes output schemas for every tool', () => {
    for (const entry of tools) {
      expect(entry.outputSchema, `${entry.name} output schema`).toBeDefined();
    }
  });

  it('declares at least one input property for every tool', () => {
    for (const entry of tools) {
      const count = Object.keys(entry.inputSchema.properties ?? {}).length;
      expect(count, `${entry.name} input properties`).toBeGreaterThan(0);
    }
  });
});
