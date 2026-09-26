/**
 * @fileoverview Unit tests for the tool registry and executor.
 */

import {describe, expect, it} from 'vitest';

import {ToolkitError} from '../src/core/errors.js';
import {
  createRegistry,
  executeTool,
  failure,
  listTools,
  success,
} from '../src/tools/index.js';
import type {ToolDefinition} from '../src/types/tools.js';

const failingTool: ToolDefinition = {
  name: 'boom',
  description: 'Always throws.',
  inputSchema: {type: 'object'},
  handler: () => {
    throw new Error('exploded');
  },
};

describe('createRegistry', () => {
  it('rejects duplicate tool names', () => {
    const tool: ToolDefinition = {
      name: 'dup',
      description: 'Duplicate.',
      inputSchema: {type: 'object'},
      handler: () => success('ok'),
    };
    expect(() => createRegistry([tool, tool])).toThrow(ToolkitError);
  });
});

describe('listTools', () => {
  it('omits handler implementations', () => {
    const registry = createRegistry([failingTool]);
    const [info] = listTools(registry);
    expect(info?.name).toBe('boom');
    expect(info).not.toHaveProperty('handler');
  });
});

describe('executeTool', () => {
  it('returns the handler output on success', async () => {
    const registry = createRegistry([
      {
        name: 'ok',
        description: 'Succeeds.',
        inputSchema: {type: 'object'},
        handler: args => success(JSON.stringify(args)),
      },
    ]);
    const output = await executeTool(registry, 'ok', {a: 1});
    expect(output.isError).toBe(false);
    expect(output.content[0]).toEqual({type: 'text', text: '{"a":1}'});
  });

  it('converts handler failures into error output', async () => {
    const registry = createRegistry([failingTool]);
    const output = await executeTool(registry, 'boom', {});
    expect(output.isError).toBe(true);
    const [block] = output.content;
    expect(block?.type === 'text' ? block.text : '').toContain('exploded');
  });

  it('throws for unknown tools', async () => {
    const registry = createRegistry([failingTool]);
    await expect(executeTool(registry, 'missing', {})).rejects.toThrow(
      ToolkitError,
    );
  });

  it('propagates the caller request id', async () => {
    let seen = '';
    const registry = createRegistry([
      {
        name: 'ctx',
        description: 'Captures context.',
        inputSchema: {type: 'object'},
        handler: (_args, context) => {
          seen = context.requestId;
          return success('ok');
        },
      },
    ]);
    await executeTool(registry, 'ctx', {}, {requestId: 'req-42'});
    expect(seen).toBe('req-42');
  });
});

describe('failure', () => {
  it('builds an error output', () => {
    const output = failure('nope');
    expect(output.isError).toBe(true);
    expect(output.content).toEqual([{type: 'text', text: 'nope'}]);
  });
});
