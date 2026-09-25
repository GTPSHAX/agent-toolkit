/**
 * @fileoverview The built-in `json.format` tool.
 */

import type {JsonValue} from '../types/common.js';
import type {ToolDefinition, ToolOutput} from '../types/tools.js';
import {formatJson} from '../utils/json.js';
import {failure, success} from './executor.js';

/** Tool name. */
export const JSON_FORMAT_TOOL_NAME = 'json.format';

/**
 * @brief Creates the `json.format` tool.
 *
 * @return A tool definition that formats a JSON document.
 */
export function jsonFormatTool(): ToolDefinition {
  return {
    name: JSON_FORMAT_TOOL_NAME,
    title: 'JSON formatter',
    description: 'Parses and pretty-prints or compacts a JSON document.',
    inputSchema: {
      type: 'object',
      properties: {
        json: {type: 'string', description: 'JSON source text.'},
        indent: {
          type: 'number',
          description: 'Space indentation, 0 to 10; 0 compacts.',
        },
        sortKeys: {
          type: 'boolean',
          description: 'Sort object keys recursively.',
        },
      },
      required: ['json'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        text: {type: 'string'},
        indent: {type: 'number'},
        sortKeys: {type: 'boolean'},
      },
      required: ['text', 'indent', 'sortKeys'],
    },
    handler: handleJsonFormat,
  };
}

/**
 * @brief Handles a `json.format` invocation.
 *
 * @param args Arguments carrying the `json` string and options.
 * @return Formatted output, or an error output when parsing fails.
 */
function handleJsonFormat(args: JsonValue): ToolOutput {
  const json = readString(args, 'json');
  if (json === undefined) {
    return failure('json.format requires a "json" string argument');
  }
  const indent = readNumber(args, 'indent');
  const sortKeys = readBoolean(args, 'sortKeys');
  const result = formatJson(json, {
    ...(indent === undefined ? {} : {indent}),
    ...(sortKeys === undefined ? {} : {sortKeys}),
  });
  if (!result.valid) {
    return failure(`json.format: ${result.error ?? 'invalid JSON'}`);
  }
  const structuredContent = {
    text: result.text,
    indent: indent ?? 2,
    sortKeys: sortKeys ?? false,
  };
  return success(result.text, structuredContent);
}

/**
 * @brief Reads a string field from a tool argument value.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name to read.
 * @return The string when present and valid, otherwise `undefined`.
 */
function readString(args: JsonValue, key: string): string | undefined {
  const value = readField(args, key);
  return typeof value === 'string' ? value : undefined;
}

/**
 * @brief Reads a number field from a tool argument value.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name to read.
 * @return The number when present and valid, otherwise `undefined`.
 */
function readNumber(args: JsonValue, key: string): number | undefined {
  const value = readField(args, key);
  return typeof value === 'number' ? value : undefined;
}

/**
 * @brief Reads a boolean field from a tool argument value.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name to read.
 * @return The boolean when present and valid, otherwise `undefined`.
 */
function readBoolean(args: JsonValue, key: string): boolean | undefined {
  const value = readField(args, key);
  return typeof value === 'boolean' ? value : undefined;
}

/**
 * @brief Reads a field from a tool argument object.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name to read.
 * @return The field value, or `undefined` when absent.
 */
function readField(args: JsonValue, key: string): JsonValue | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return undefined;
  }
  return args[key];
}
