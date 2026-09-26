/**
 * @fileoverview The built-in `regex` tool.
 */

import type {JsonValue} from '../types/common.js';
import type {RegexMode} from '../types/regex.js';
import type {JsonSchema, ToolDefinition, ToolOutput} from '../types/tools.js';
import {applyRegex} from '../utils/regex.js';
import {readString} from './args.js';
import {failure, success} from './executor.js';

/** Tool name. */
export const REGEX_TOOL_NAME = 'regex';

/** Output schema of the `regex` tool. */
const REGEX_OUTPUT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    pattern: {type: 'string'},
    flags: {type: 'string'},
    mode: {type: 'string'},
    count: {type: 'number'},
    matched: {type: 'boolean'},
    matches: {type: 'array'},
    replaced: {type: 'string'},
    parts: {type: 'array', items: {type: 'string'}},
    error: {type: 'string'},
  },
  required: ['pattern', 'flags', 'mode', 'count', 'matched'],
};

/**
 * @brief Creates the `regex` tool.
 *
 * @return A tool definition that tests and applies regular expressions.
 */
export function regexTool(): ToolDefinition {
  return {
    name: REGEX_TOOL_NAME,
    title: 'Regular expression',
    description:
      'Tests, extracts, replaces, or splits with a regular expression and ' +
      'returns match positions and capture groups.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {type: 'string', description: 'Pattern without delimiters.'},
        input: {type: 'string', description: 'Input string to operate on.'},
        mode: {
          type: 'string',
          description: 'Operation; defaults to match.',
          enum: ['match', 'replace', 'split'],
        },
        flags: {type: 'string', description: 'Flags such as "gi" or "ims".'},
        replacement: {
          type: 'string',
          description: 'Replacement text for replace mode ($1, $<name>).',
        },
        limit: {type: 'number', description: 'Maximum matches to keep.'},
      },
      required: ['pattern', 'input'],
    },
    outputSchema: REGEX_OUTPUT_SCHEMA,
    handler: handleRegex,
  };
}

/**
 * @brief Handles a `regex` invocation.
 *
 * @param args Arguments carrying the pattern, input, and options.
 * @return Match, replacement, or split output, or an error output.
 */
function handleRegex(args: JsonValue): ToolOutput {
  const pattern = readString(args, 'pattern');
  const input = readString(args, 'input');
  if (pattern === undefined || input === undefined) {
    return failure('regex requires "pattern" and "input" string arguments');
  }
  const mode = readString(args, 'mode');
  const flags = readString(args, 'flags');
  const replacement = readString(args, 'replacement');
  const limit = readNumber(args, 'limit');
  const result = applyRegex({
    pattern,
    input,
    ...(isRegexMode(mode) ? {mode} : {}),
    ...(flags === undefined ? {} : {flags}),
    ...(replacement === undefined ? {} : {replacement}),
    ...(limit === undefined ? {} : {limit: Math.max(0, Math.trunc(limit))}),
  });
  if (result.error !== undefined) {
    return failure(`regex: ${result.error}`);
  }
  return success(formatRegex(result), toJson(result));
}

/**
 * @brief Checks whether a value is a supported regex mode.
 *
 * @param value Candidate mode.
 * @return True for `match`, `replace`, or `split`.
 */
function isRegexMode(value: string | undefined): value is RegexMode {
  return value === 'match' || value === 'replace' || value === 'split';
}

/**
 * @brief Renders a regex result as readable text.
 *
 * @param result Regex result.
 * @return A summary aligned with the performed operation.
 */
function formatRegex(result: ReturnType<typeof applyRegex>): string {
  if (result.parts !== undefined) {
    return result.parts.join('\n');
  }
  if (result.replaced !== undefined) {
    return result.replaced;
  }
  return (result.matches ?? [])
    .map(entry => {
      const groups = entry.groups
        .map((group, index) => `${index + 1}:${group ?? ''}`)
        .join(' · ');
      return `${entry.index}: ${entry.match}${groups ? ` [${groups}]` : ''}`;
    })
    .join('\n');
}

/**
 * @brief Reads a numeric field from tool arguments.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name.
 * @return The number when present and finite, otherwise `undefined`.
 */
function readNumber(args: JsonValue, key: string): number | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return undefined;
  }
  const value = args[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * @brief Converts a value into JSON-safe tool payload data.
 *
 * @param value Value to convert.
 * @return JSON-compatible value.
 */
function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
