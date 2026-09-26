/**
 * @fileoverview The built-in `csv` tool.
 */

import type {JsonValue} from '../types/common.js';
import type {JsonSchema, ToolDefinition, ToolOutput} from '../types/tools.js';
import {
  DEFAULT_DELIMITER,
  TAB_DELIMITER,
  parseCsv,
  stringifyCsv,
} from '../utils/csv.js';
import {readString} from './args.js';
import {failure, success} from './executor.js';

/** Tool name. */
export const CSV_TOOL_NAME = 'csv';

/** Output schema of the `csv` tool. */
const CSV_OUTPUT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    mode: {type: 'string'},
    delimiter: {type: 'string'},
    table: {type: 'object'},
    text: {type: 'string'},
    data: {},
  },
  required: ['mode', 'delimiter'],
};

/**
 * @brief Creates the `csv` tool.
 *
 * @return A tool definition that parses or serializes delimited text.
 */
export function csvTool(): ToolDefinition {
  return {
    name: CSV_TOOL_NAME,
    title: 'CSV',
    description:
      'Parses CSV/TSV text into rows or serializes records into CSV/TSV.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          description: 'parse reads text into rows; stringify writes text.',
          enum: ['parse', 'stringify'],
        },
        text: {type: 'string', description: 'Delimited text for parse.'},
        data: {
          type: 'array',
          description: 'Array of objects or arrays for stringify.',
        },
        delimiter: {
          type: 'string',
          description: 'Field delimiter; use "tab" for TSV. Defaults to comma.',
        },
        header: {
          type: 'boolean',
          description: 'Whether the first row is a header.',
        },
        columns: {
          type: 'array',
          description: 'Explicit column order for stringify.',
        },
        skipEmptyLines: {
          type: 'boolean',
          description: 'Drop empty records when parsing.',
        },
      },
      required: ['mode'],
    },
    outputSchema: CSV_OUTPUT_SCHEMA,
    handler: handleCsv,
  };
}

/**
 * @brief Handles a `csv` invocation.
 *
 * @param args Arguments carrying the mode and its inputs.
 * @return Parsed table or serialized text, or an error output.
 */
function handleCsv(args: JsonValue): ToolOutput {
  const mode = readString(args, 'mode');
  if (mode !== 'parse' && mode !== 'stringify') {
    return failure('csv requires "mode" to be "parse" or "stringify"');
  }
  const delimiter = resolveDelimiter(readString(args, 'delimiter'));
  try {
    if (mode === 'parse') {
      const text = readString(args, 'text');
      if (text === undefined) {
        return failure('csv parse requires a "text" string argument');
      }
      const header = readBoolean(args, 'header');
      const skipEmptyLines = readBoolean(args, 'skipEmptyLines');
      const table = parseCsv(text, {
        delimiter,
        ...(header === undefined ? {} : {header}),
        ...(skipEmptyLines === undefined ? {} : {skipEmptyLines}),
      });
      return success(JSON.stringify(table), toJson({mode, delimiter, table}));
    }
    const data = readField(args, 'data');
    if (data === undefined) {
      return failure('csv stringify requires a "data" array argument');
    }
    const columns = readStringArray(args, 'columns');
    const header = readBoolean(args, 'header');
    const text = stringifyCsv(data, {
      delimiter,
      ...(columns === undefined ? {} : {columns}),
      ...(header === undefined ? {} : {header}),
    });
    return success(text, toJson({mode, delimiter, text, data}));
  } catch (cause) {
    return failure(
      `csv: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

/**
 * @brief Maps a delimiter argument to its character.
 *
 * @param value Raw delimiter argument.
 * @return The delimiter character; defaults to a comma.
 */
function resolveDelimiter(value: string | undefined): string {
  if (value === undefined || value === '') {
    return DEFAULT_DELIMITER;
  }
  if (value === 'tab' || value === '\\t') {
    return TAB_DELIMITER;
  }
  if (value === 'comma') {
    return DEFAULT_DELIMITER;
  }
  return value;
}

/**
 * @brief Reads a field from a tool argument object.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name.
 * @return The field value, or `undefined` when absent.
 */
function readField(args: JsonValue, key: string): JsonValue | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return undefined;
  }
  return args[key];
}

/**
 * @brief Reads a boolean field from tool arguments.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name.
 * @return The boolean when present, otherwise `undefined`.
 */
function readBoolean(args: JsonValue, key: string): boolean | undefined {
  const value = readField(args, key);
  return typeof value === 'boolean' ? value : undefined;
}

/**
 * @brief Reads a string-array field from tool arguments.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name.
 * @return The string array when valid, otherwise `undefined`.
 */
function readStringArray(args: JsonValue, key: string): string[] | undefined {
  const value = readField(args, key);
  return Array.isArray(value) &&
    value.every((item): item is string => typeof item === 'string')
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
