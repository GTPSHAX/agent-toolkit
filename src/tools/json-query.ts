/**
 * @fileoverview The built-in `json.query` tool.
 */

import type {JsonValue} from '../types/common.js';
import type {JsonSchema, ToolDefinition, ToolOutput} from '../types/tools.js';
import {queryJson} from '../utils/json-query.js';
import {readString} from './args.js';
import {failure, success} from './executor.js';

/** Tool name. */
export const JSON_QUERY_TOOL_NAME = 'json.query';

/** Output schema of the `json.query` tool. */
const JSON_QUERY_OUTPUT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    query: {type: 'string'},
    count: {type: 'number'},
    matches: {type: 'array'},
    value: {},
    error: {type: 'string'},
  },
  required: ['query', 'count', 'matches'],
};

/**
 * @brief Creates the `json.query` tool.
 *
 * @return A tool definition that selects values from a JSON document.
 */
export function jsonQueryTool(): ToolDefinition {
  return {
    name: JSON_QUERY_TOOL_NAME,
    title: 'JSON query',
    description:
      'Selects values from a JSON document with a jq-like path such as ' +
      'data.items[].name.',
    inputSchema: {
      type: 'object',
      properties: {
        json: {type: 'string', description: 'JSON source text.'},
        query: {
          type: 'string',
          description:
            'Path using dots, [n], [] to iterate arrays, and * for keys.',
        },
      },
      required: ['json', 'query'],
    },
    outputSchema: JSON_QUERY_OUTPUT_SCHEMA,
    handler: handleJsonQuery,
  };
}

/**
 * @brief Handles a `json.query` invocation.
 *
 * @param args Arguments carrying the `json` source and `query` path.
 * @return Selected values, or an error output.
 */
function handleJsonQuery(args: JsonValue): ToolOutput {
  const json = readString(args, 'json');
  const query = readString(args, 'query');
  if (json === undefined || query === undefined) {
    return failure('json.query requires "json" and "query" string arguments');
  }
  let document: JsonValue;
  try {
    document = JSON.parse(json) as JsonValue;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return failure(`json.query: invalid JSON: ${message}`);
  }
  const result = queryJson(document, query);
  if (result.error !== undefined) {
    return failure(`json.query: ${result.error}`);
  }
  return success(formatQueryResult(result), toJson(result));
}

/**
 * @brief Renders a query result as readable text.
 *
 * @param result Query result.
 * @return One line per match, or a single value.
 */
function formatQueryResult(result: ReturnType<typeof queryJson>): string {
  if (result.matches.length === 0) {
    return 'no matches';
  }
  if (result.matches.length === 1) {
    return JSON.stringify(result.matches[0]?.value, null, 2);
  }
  return result.matches
    .map(entry => `${entry.path} = ${JSON.stringify(entry.value)}`)
    .join('\n');
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
