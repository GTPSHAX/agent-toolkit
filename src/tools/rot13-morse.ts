/**
 * @fileoverview The built-in `rot13` and `morse` tools.
 */

import type {JsonValue} from '../types/common.js';
import type {ToolDefinition, ToolOutput} from '../types/tools.js';
import {morseDecode, morseEncode, rot13} from '../utils/rot13-morse.js';
import {readMode, readString} from './args.js';
import {failure, success} from './executor.js';

/** ROT13 tool name. */
export const ROT13_TOOL_NAME = 'rot13';

/** Morse tool name. */
export const MORSE_TOOL_NAME = 'morse';

/**
 * @brief Creates the `rot13` tool.
 *
 * @return A tool definition that applies ROT13.
 */
export function rot13Tool(): ToolDefinition {
  return {
    name: ROT13_TOOL_NAME,
    title: 'ROT13',
    description: 'Applies the ROT13 substitution to ASCII letters.',
    inputSchema: {
      type: 'object',
      properties: {text: {type: 'string'}},
      required: ['text'],
    },
    outputSchema: {
      type: 'object',
      properties: {text: {type: 'string'}},
      required: ['text'],
    },
    handler: handleRot13,
  };
}

/**
 * @brief Creates the `morse` tool.
 *
 * @return A tool definition that encodes or decodes Morse code.
 */
export function morseTool(): ToolDefinition {
  return {
    name: MORSE_TOOL_NAME,
    title: 'Morse code',
    description: 'Encodes text as Morse code or decodes Morse code.',
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
    handler: handleMorse,
  };
}

/**
 * @brief Handles a `rot13` invocation.
 *
 * @param args Arguments carrying `text`.
 * @return Rotated output, or an error output.
 */
function handleRot13(args: JsonValue): ToolOutput {
  const text = readString(args, 'text');
  if (text === undefined) {
    return failure('rot13 requires a "text" string argument');
  }
  const result = rot13(text);
  return success(result, {text: result});
}

/**
 * @brief Handles a `morse` invocation.
 *
 * @param args Arguments carrying `text` and `mode`.
 * @return Encoded or decoded output, or an error output.
 */
function handleMorse(args: JsonValue): ToolOutput {
  const text = readString(args, 'text');
  const mode = readMode(args);
  if (text === undefined || mode === undefined) {
    return failure('morse requires "text" and a "mode" of encode or decode');
  }
  try {
    const result = mode === 'encode' ? morseEncode(text) : morseDecode(text);
    return success(result, {text: result, mode});
  } catch (cause) {
    return failure(`morse: ${cause instanceof Error ? cause.message : cause}`);
  }
}
