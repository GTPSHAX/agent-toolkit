/**
 * @fileoverview The built-in `base64` tool.
 */

import type {JsonValue} from '../types/common.js';
import type {ToolDefinition, ToolOutput} from '../types/tools.js';
import {base64Decode, base64Encode} from '../utils/base64.js';
import {readBoolean, readMode, readString} from './args.js';
import {failure, success} from './executor.js';

/** Tool name. */
export const BASE64_TOOL_NAME = 'base64';

/**
 * @brief Creates the `base64` tool.
 *
 * @return A tool definition that encodes or decodes Base64.
 */
export function base64Tool(): ToolDefinition {
  return {
    name: BASE64_TOOL_NAME,
    title: 'Base64',
    description: 'Encodes or decodes Base64 text.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {type: 'string', description: 'Input text.'},
        mode: {
          type: 'string',
          description: 'Encoding direction.',
          enum: ['encode', 'decode'],
        },
        urlSafe: {
          type: 'boolean',
          description: 'Use the URL-safe alphabet when encoding.',
        },
      },
      required: ['text', 'mode'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        text: {type: 'string'},
        mode: {type: 'string'},
        urlSafe: {type: 'boolean'},
      },
      required: ['text', 'mode', 'urlSafe'],
    },
    handler: handleBase64,
  };
}

/**
 * @brief Handles a `base64` invocation.
 *
 * @param args Arguments carrying `text`, `mode`, and optional `urlSafe`.
 * @return Encoded or decoded output, or an error output.
 */
function handleBase64(args: JsonValue): ToolOutput {
  const text = readString(args, 'text');
  const mode = readMode(args);
  if (text === undefined || mode === undefined) {
    return failure('base64 requires "text" and a "mode" of encode or decode');
  }
  const urlSafe = readBoolean(args, 'urlSafe') === true;
  try {
    const result =
      mode === 'encode' ? base64Encode(text, urlSafe) : base64Decode(text);
    return success(result, {text: result, mode, urlSafe});
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return failure(`base64: ${message}`);
  }
}
