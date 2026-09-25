/**
 * @fileoverview The built-in `text.stats` tool.
 */

import {computeTextStats} from '../utils/text-stats.js';
import type {JsonValue} from '../types/common.js';
import type {ToolDefinition, ToolOutput} from '../types/tools.js';
import {failure, success} from './executor.js';

/** Tool name. */
export const TEXT_STATS_TOOL_NAME = 'text.stats';

/**
 * @brief Creates the `text.stats` tool.
 *
 * @return A tool definition that reports statistics for a text block.
 */
export function textStatsTool(): ToolDefinition {
  return {
    name: TEXT_STATS_TOOL_NAME,
    title: 'Text statistics',
    description:
      'Counts characters, words, lines, sentences, and unique words.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {type: 'string', description: 'Text to analyse.'},
      },
      required: ['text'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        characters: {type: 'number'},
        charactersNoSpaces: {type: 'number'},
        words: {type: 'number'},
        lines: {type: 'number'},
        sentences: {type: 'number'},
        uniqueWords: {type: 'number'},
        longestWord: {type: 'string'},
      },
      required: [
        'characters',
        'charactersNoSpaces',
        'words',
        'lines',
        'sentences',
        'uniqueWords',
        'longestWord',
      ],
    },
    handler: handleTextStats,
  };
}

/**
 * @brief Handles a `text.stats` invocation.
 *
 * @param args Arguments carrying the `text` string.
 * @return Statistics, or an error output when `text` is missing.
 */
function handleTextStats(args: JsonValue): ToolOutput {
  const text = readTextArg(args);
  if (text === undefined) {
    return failure('text.stats requires a "text" string argument');
  }
  const stats = computeTextStats(text);
  return success(JSON.stringify(stats), stats);
}

/**
 * @brief Reads the `text` argument from a tool argument value.
 *
 * @param args Argument value of unknown shape.
 * @return The string when present and valid, otherwise `undefined`.
 */
function readTextArg(args: JsonValue): string | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return undefined;
  }
  const value = args['text'];
  return typeof value === 'string' ? value : undefined;
}
