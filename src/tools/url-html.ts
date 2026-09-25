/**
 * @fileoverview The built-in `url` and `html` tools.
 */

import type {JsonValue} from '../types/common.js';
import type {ToolDefinition, ToolOutput} from '../types/tools.js';
import {
  htmlDecode,
  htmlEncode,
  urlDecode,
  urlEncode,
} from '../utils/url-html.js';
import {readBoolean, readMode, readString} from './args.js';
import {failure, success} from './executor.js';

/** URL tool name. */
export const URL_TOOL_NAME = 'url';

/** HTML tool name. */
export const HTML_TOOL_NAME = 'html';

/**
 * @brief Creates the `url` tool.
 *
 * @return A tool definition that encodes or decodes URL components.
 */
export function urlTool(): ToolDefinition {
  return {
    name: URL_TOOL_NAME,
    title: 'URL',
    description: 'Encodes or decodes URL components.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {type: 'string'},
        mode: {type: 'string', enum: ['encode', 'decode']},
        full: {
          type: 'boolean',
          description: 'Treat input as a whole URL rather than a component.',
        },
      },
      required: ['text', 'mode'],
    },
    outputSchema: {
      type: 'object',
      properties: {text: {type: 'string'}, mode: {type: 'string'}},
      required: ['text', 'mode'],
    },
    handler: handleUrl,
  };
}

/**
 * @brief Creates the `html` tool.
 *
 * @return A tool definition that encodes or decodes HTML entities.
 */
export function htmlTool(): ToolDefinition {
  return {
    name: HTML_TOOL_NAME,
    title: 'HTML entities',
    description: 'Encodes or decodes HTML entities.',
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
    handler: handleHtml,
  };
}

/**
 * @brief Handles a `url` invocation.
 *
 * @param args Arguments carrying `text`, `mode`, and optional `full`.
 * @return Encoded or decoded output, or an error output.
 */
function handleUrl(args: JsonValue): ToolOutput {
  const text = readString(args, 'text');
  const mode = readMode(args);
  if (text === undefined || mode === undefined) {
    return failure('url requires "text" and a "mode" of encode or decode');
  }
  const full = readBoolean(args, 'full') === true;
  try {
    const result =
      mode === 'encode' ? urlEncode(text, full) : urlDecode(text, full);
    return success(result, {text: result, mode});
  } catch (cause) {
    return failure(`url: ${cause instanceof Error ? cause.message : cause}`);
  }
}

/**
 * @brief Handles an `html` invocation.
 *
 * @param args Arguments carrying `text` and `mode`.
 * @return Encoded or decoded output, or an error output.
 */
function handleHtml(args: JsonValue): ToolOutput {
  const text = readString(args, 'text');
  const mode = readMode(args);
  if (text === undefined || mode === undefined) {
    return failure('html requires "text" and a "mode" of encode or decode');
  }
  const result = mode === 'encode' ? htmlEncode(text) : htmlDecode(text);
  return success(result, {text: result, mode});
}
