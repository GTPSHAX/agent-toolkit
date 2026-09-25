/**
 * @fileoverview Unit tests for the MCP stdio request handler.
 */

import {describe, expect, it} from 'vitest';

import {createMcpServer} from '../src/mcp.js';
import {createRegistry} from '../src/tools/index.js';
import {echoTool} from '../src/tools/executor.js';

/** Server backed by the echo tool. */
const server = createMcpServer(createRegistry([echoTool()]));

describe('initialize', () => {
  it('echoes a supported protocol version and reports tools capability', async () => {
    const response = await server.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {protocolVersion: '2025-03-26'},
    });
    expect(response?.result).toMatchObject({
      protocolVersion: '2025-03-26',
      capabilities: {tools: {listChanged: false}},
      serverInfo: {name: 'agent-toolkit'},
    });
  });

  it('falls back to the default version for an unknown request', async () => {
    const response = await server.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {protocolVersion: '1999-01-01'},
    });
    expect(response?.result).toMatchObject({protocolVersion: '2025-06-18'});
  });
});

describe('notifications', () => {
  it('produces no response for initialized or cancelled', async () => {
    expect(
      await server.handle({method: 'notifications/initialized'}),
    ).toBeNull();
    expect(await server.handle({method: 'notifications/cancelled'})).toBeNull();
  });
});

describe('tools/list', () => {
  it('returns tool metadata with input schemas', async () => {
    const response = await server.handle({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });
    const result = response?.result as {
      tools: {name: string; inputSchema: unknown}[];
    };
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]?.name).toBe('echo');
    expect(result.tools[0]?.inputSchema).toBeTypeOf('object');
  });
});

describe('tools/call', () => {
  it('runs a tool and returns its content and isError flag', async () => {
    const response = await server.handle({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {name: 'echo', arguments: {value: 'hi'}},
    });
    expect(response?.result).toMatchObject({isError: false});
    expect(
      (response?.result as {structuredContent: unknown}).structuredContent,
    ).toEqual({value: 'hi'});
  });

  it('returns an error for an unknown tool', async () => {
    const response = await server.handle({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {name: 'missing', arguments: {}},
    });
    expect(response?.error?.message).toContain('Unknown tool');
  });

  it('rejects params without a name', async () => {
    const response = await server.handle({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {},
    });
    expect(response?.error?.code).toBe(-32602);
  });
});

describe('unknown method', () => {
  it('returns method not found', async () => {
    const response = await server.handle({
      jsonrpc: '2.0',
      id: 6,
      method: 'does/not/exist',
    });
    expect(response?.error?.code).toBe(-32601);
  });
});

describe('ping', () => {
  it('returns an empty result', async () => {
    const response = await server.handle({
      jsonrpc: '2.0',
      id: 7,
      method: 'ping',
    });
    expect(response?.result).toEqual({});
  });
});
