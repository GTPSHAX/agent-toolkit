/**
 * @fileoverview The built-in `hex` and `binary` tools.
 */

import type {JsonValue} from '../types/common.js';
import type {ToolDefinition, ToolOutput} from '../types/tools.js';
import {
  binaryDecode,
  binaryEncode,
  hexDecode,
  hexEncode,
} from '../utils/hex-binary.js';
import {readBoolean, readMode, readString} from './args.js';
import {failure, success} from './executor.js';

/** Hex tool name. */
export const HEX_TOOL_NAME = 'hex';

/** Binary tool name. */
export const BINARY_TOOL_NAME = 'binary';

/**
 * @brief Creates the `hex` tool.
 *
 * @return A tool definition that encodes or decodes hexadecimal.
 */
export function hexTool(): ToolDefinition {
  return {
    name: HEX_TOOL_NAME,
    title: 'Hex',
    description: 'Encodes or decodes hexadecimal text.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {type: 'string'},
        mode: {type: 'string', enum: ['encode', 'decode']},
        upper: {type: 'boolean', description: 'Uppercase hex when encoding.'},
      },
      required: ['text', 'mode'],
    },
    outputSchema: {
      type: 'object',
      properties: {text: {type: 'string'}, mode: {type: 'string'}},
      required: ['text', 'mode'],
    },
    handler: handleHex,
  };
}

/**
 * @brief Creates the `binary` tool.
 *
 * @return A tool definition that encodes or decodes 8-bit binary.
 */
export function binaryTool(): ToolDefinition {
  return {
    name: BINARY_TOOL_NAME,
    title: 'Binary',
    description: 'Encodes or decodes 8-bit binary text.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {type: 'string'},
        mode: {type: 'string', enum: ['encode', 'decode']},
      },
      required: ['text', 'mode'],
    },
    outputSchema: {
      type: 'object',
      properties: {text: {type: 'string'}, mode: {type: 'string'}},
      required: ['text', 'mode'],
    },
    handler: handleBinary,
  };
}

/**
 * @brief Handles a `hex` invocation.
 *
 * @param args Arguments carrying `text`, `mode`, and optional `upper`.
 * @return Encoded or decoded output, or an error output.
 */
function handleHex(args: JsonValue): ToolOutput {
  const text = readString(args, 'text');
  const mode = readMode(args);
  if (text === undefined || mode === undefined) {
    return failure('hex requires "text" and a "mode" of encode or decode');
  }
  try {
    const result =
      mode === 'encode'
        ? hexEncode(text, readBoolean(args, 'upper') === true)
        : hexDecode(text);
    return success(result, {text: result, mode});
  } catch (cause) {
    return failure(`hex: ${errorMessage(cause)}`);
  }
}

/**
 * @brief Handles a `binary` invocation.
 *
 * @param args Arguments carrying `text` and `mode`.
 * @return Encoded or decoded output, or an error output.
 */
function handleBinary(args: JsonValue): ToolOutput {
  const text = readString(args, 'text');
  const mode = readMode(args);
  if (text === undefined || mode === undefined) {
    return failure('binary requires "text" and a "mode" of encode or decode');
  }
  try {
    const result = mode === 'encode' ? binaryEncode(text) : binaryDecode(text);
    return success(result, {text: result, mode});
  } catch (cause) {
    return failure(`binary: ${errorMessage(cause)}`);
  }
}

/**
 * @brief Extracts a message from an unknown thrown value.
 *
 * @param cause Thrown value.
 * @return Human-readable message.
 */
function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
