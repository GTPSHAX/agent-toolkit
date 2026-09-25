/**
 * @fileoverview Model Context Protocol server over the stdio transport.
 *
 * Speaks newline-delimited JSON-RPC 2.0 on stdin/stdout. Only valid MCP
 * messages are written to stdout; diagnostics go to stderr.
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
 */

import {createInterface} from 'node:readline';

import type {JsonValue} from './types/common.js';
import type {ToolOutput} from './types/tools.js';
import {ToolkitError} from './core/errors.js';
import {createRegistry, executeTool, listTools} from './tools/index.js';
import {defaultTools} from './index.js';
import type {ToolRegistry} from './tools/registry.js';

/** Protocol versions this server can speak. */
export const SUPPORTED_PROTOCOL_VERSIONS: readonly string[] = [
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
];

/** Protocol version offered when the client sends an unknown version. */
export const DEFAULT_PROTOCOL_VERSION = '2025-06-18';

/** Server implementation name reported during initialization. */
export const SERVER_NAME = 'agent-toolkit';

/** Error code for malformed JSON. */
export const PARSE_ERROR = -32700;
/** Error code for an unknown method. */
export const METHOD_NOT_FOUND = -32601;
/** Error code for invalid method parameters. */
export const INVALID_PARAMS = -32602;

/** A JSON-RPC request or notification. */
export interface McpMessage {
  readonly jsonrpc?: string;
  readonly id?: string | number | null;
  readonly method?: string;
  readonly params?: JsonValue;
}

/** A JSON-RPC error object. */
export interface McpErrorObject {
  readonly code: number;
  readonly message: string;
  readonly data?: JsonValue;
}

/** A JSON-RPC response. */
export interface McpResponse {
  readonly jsonrpc: '2.0';
  readonly id: string | number | null;
  readonly result?: JsonValue;
  readonly error?: McpErrorObject;
}

/** A running MCP message handler. */
export interface McpServer {
  /**
   * Handles one incoming message.
   *
   * @param message Parsed JSON-RPC message.
   * @return A response, or `null` for notifications.
   */
  handle(message: McpMessage): Promise<McpResponse | null>;
}

/** Options accepted by {@link createMcpServer}. */
export interface McpServerOptions {
  readonly name?: string;
  readonly version?: string;
}

/**
 * @brief Creates an MCP message handler backed by a tool registry.
 *
 * @param registry Registry of tools to expose.
 * @param options Server identity overrides.
 * @return A handler for JSON-RPC messages.
 */
export function createMcpServer(
  registry: ToolRegistry = createRegistry(defaultTools()),
  options: McpServerOptions = {},
): McpServer {
  const name = options.name ?? SERVER_NAME;
  const version = options.version ?? '1.0.0';
  return {
    async handle(message: McpMessage): Promise<McpResponse | null> {
      const id = message.id ?? null;
      const method = message.method;
      if (typeof method !== 'string') {
        return error(id, INVALID_PARAMS, 'missing method');
      }
      switch (method) {
        case 'initialize':
          return reply(id, {
            protocolVersion: negotiateVersion(message.params),
            capabilities: {tools: {listChanged: false}},
            serverInfo: {name, version},
          });
        case 'notifications/initialized':
        case 'notifications/cancelled':
          return null;
        case 'ping':
          return reply(id, {});
        case 'tools/list':
          return reply(id, {
            tools: listTools(registry).map(tool => ({
              name: tool.name,
              ...(tool.title === undefined ? {} : {title: tool.title}),
              description: tool.description,
              inputSchema: tool.inputSchema as JsonValue,
              ...(tool.outputSchema === undefined
                ? {}
                : {outputSchema: tool.outputSchema as JsonValue}),
            })),
          });
        case 'tools/call':
          return callTool(registry, id, message.params);
        default:
          return error(id, METHOD_NOT_FOUND, `unknown method: ${method}`);
      }
    },
  };
}

/**
 * @brief Executes a `tools/call` request.
 *
 * @param registry Registry of tools.
 * @param id Request identifier.
 * @param params Request parameters carrying `name` and `arguments`.
 * @return A result response, or an error response.
 */
async function callTool(
  registry: ToolRegistry,
  id: string | number | null,
  params: JsonValue | undefined,
): Promise<McpResponse> {
  if (params === null || typeof params !== 'object' || Array.isArray(params)) {
    return error(id, INVALID_PARAMS, 'params must be an object');
  }
  const name = params['name'];
  if (typeof name !== 'string') {
    return error(id, INVALID_PARAMS, 'params.name must be a string');
  }
  const args = params['arguments'] ?? {};
  try {
    const output: ToolOutput = await executeTool(
      registry,
      name,
      args as JsonValue,
    );
    return reply(id, output as unknown as JsonValue);
  } catch (cause) {
    if (cause instanceof ToolkitError && cause.code === 'UNKNOWN_TOOL') {
      return error(id, INVALID_PARAMS, cause.message);
    }
    return error(
      id,
      INVALID_PARAMS,
      cause instanceof Error ? cause.message : String(cause),
    );
  }
}

/**
 * @brief Chooses a protocol version for the session.
 *
 * @param params Initialize parameters, if any.
 * @return The client version when supported, otherwise the server default.
 */
function negotiateVersion(params: JsonValue | undefined): string {
  if (params !== null && typeof params === 'object' && !Array.isArray(params)) {
    const requested = params['protocolVersion'];
    if (
      typeof requested === 'string' &&
      SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
    ) {
      return requested;
    }
  }
  return DEFAULT_PROTOCOL_VERSION;
}

/**
 * @brief Builds a successful JSON-RPC response.
 *
 * @param id Request identifier.
 * @param result Result payload.
 * @return A response object.
 */
function reply(id: string | number | null, result: JsonValue): McpResponse {
  return {jsonrpc: '2.0', id, result};
}

/**
 * @brief Builds a JSON-RPC error response.
 *
 * @param id Request identifier.
 * @param code Error code.
 * @param message Error message.
 * @return A response object carrying the error.
 */
function error(
  id: string | number | null,
  code: number,
  message: string,
): McpResponse {
  return {jsonrpc: '2.0', id, error: {code, message}};
}

/**
 * @brief Runs the MCP server until stdin closes.
 *
 * @param server Handler, defaulting to a server over the built-in tools.
 * @return Resolves when the input stream ends.
 */
export async function runMcpServer(
  server: McpServer = createMcpServer(),
): Promise<void> {
  const lines = createInterface({input: process.stdin, crlfDelay: Infinity});
  for await (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    await handleLine(server, trimmed);
  }
}

/**
 * @brief Parses and handles one input line, writing any response.
 *
 * @param server Message handler.
 * @param line Raw input line.
 */
async function handleLine(server: McpServer, line: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    writeMessage({
      jsonrpc: '2.0',
      id: null,
      error: {code: PARSE_ERROR, message: 'parse error'},
    });
    return;
  }
  const messages = Array.isArray(parsed) ? parsed : [parsed];
  for (const message of messages) {
    const response = await server.handle(message as McpMessage);
    if (response) {
      writeMessage(response);
    }
  }
}

/**
 * @brief Writes one JSON-RPC message to stdout as a single line.
 *
 * @param message Message to write.
 */
function writeMessage(message: McpResponse): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
