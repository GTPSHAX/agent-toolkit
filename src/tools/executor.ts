/**
 * @fileoverview Executes registered tools and normalizes their results.
 */

import {randomUUID} from 'node:crypto';

import type {JsonValue} from '../types/common.js';
import type {
  ContentItem,
  ExecuteOptions,
  ToolContext,
  ToolDefinition,
  ToolOutput,
} from '../types/tools.js';
import type {ToolRegistry} from './registry.js';
import {getTool} from './registry.js';

/** Name of the built-in tool that echoes its arguments. */
export const ECHO_TOOL_NAME = 'echo';

/**
 * @brief Creates a successful tool output with one text block.
 *
 * @param text Text to return.
 * @param structuredContent Optional machine-readable payload.
 * @return A `ToolOutput` with `isError: false`.
 */
export function success(
  text: string,
  structuredContent?: JsonValue,
): ToolOutput {
  const content: ContentItem[] = [{type: 'text', text}];
  return structuredContent === undefined
    ? {content, isError: false}
    : {content, structuredContent, isError: false};
}

/**
 * @brief Creates a failed tool output with one text block.
 *
 * @param message Human-readable failure description.
 * @return A `ToolOutput` with `isError: true`.
 */
export function failure(message: string): ToolOutput {
  return {content: [{type: 'text', text: message}], isError: true};
}

const echoHandler = async (args: JsonValue): Promise<ToolOutput> =>
  success(JSON.stringify(args), args);

/**
 * @brief Creates the built-in `echo` tool.
 *
 * @return A tool definition for `echo`.
 */
export function echoTool(): ToolDefinition {
  return {
    name: ECHO_TOOL_NAME,
    title: 'Echo',
    description: 'Returns the provided arguments unchanged.',
    inputSchema: {
      type: 'object',
      properties: {
        value: {
          type: 'string',
          description: 'Any value to echo back as JSON text.',
        },
      },
      required: ['value'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        value: {type: 'string'},
      },
      required: ['value'],
    },
    handler: echoHandler,
  };
}

/**
 * @brief Runs a registered tool and captures failures as tool output.
 *
 * @param registry Registry containing the tool.
 * @param name Tool name to execute.
 * @param args Arguments to pass to the tool handler.
 * @param options Optional request identifier and abort signal.
 * @return The tool output, or an error output when the handler throws.
 */
export async function executeTool(
  registry: ToolRegistry,
  name: string,
  args: JsonValue,
  options: ExecuteOptions = {},
): Promise<ToolOutput> {
  const tool = getTool(registry, name);
  const context: ToolContext = {
    requestId: options.requestId ?? randomUUID(),
    tool: name,
    ...(options.signal ? {signal: options.signal} : {}),
  };
  try {
    return await tool.handler(args, context);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return failure(`Tool "${name}" failed: ${message}`);
  }
}
