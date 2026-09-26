/**
 * @fileoverview The built-in `time` tool.
 */

import type {JsonValue} from '../types/common.js';
import type {TimeAction} from '../types/time.js';
import type {JsonSchema, ToolDefinition, ToolOutput} from '../types/tools.js';
import {addTime, describeTime, diffTime, parseTime} from '../utils/time.js';
import {failure, success} from './executor.js';

/** Tool name. */
export const TIME_TOOL_NAME = 'time';

/** Output schema of the `time` tool. */
const TIME_OUTPUT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    action: {type: 'string'},
    point: {type: 'object'},
    span: {type: 'object'},
    error: {type: 'string'},
  },
  required: ['action'],
};

/**
 * @brief Creates the `time` tool.
 *
 * @return A tool definition for parsing, formatting, and comparing times.
 */
export function timeTool(): ToolDefinition {
  return {
    name: TIME_TOOL_NAME,
    title: 'Time',
    description:
      'Parses, formats, shifts, and compares timestamps; supports ISO, epoch, ' +
      'IANA time zones, and duration arithmetic.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Operation to perform.',
          enum: ['now', 'parse', 'format', 'add', 'diff'],
        },
        value: {type: 'string', description: 'Timestamp for parse/format/add.'},
        from: {type: 'string', description: 'Start timestamp for diff.'},
        to: {type: 'string', description: 'End timestamp for diff.'},
        duration: {
          type: 'string',
          description: 'Duration to add, e.g. 1d2h30m or PT1H30M.',
        },
        format: {
          type: 'string',
          description: 'Format tokens, e.g. YYYY-MM-DD.',
        },
        timeZone: {
          type: 'string',
          description: 'IANA zone, e.g. Asia/Jakarta.',
        },
        locale: {type: 'string', description: 'Locale for names.'},
      },
      required: ['action'],
    },
    outputSchema: TIME_OUTPUT_SCHEMA,
    handler: handleTime,
  };
}

/**
 * @brief Handles a `time` invocation.
 *
 * @param args Arguments carrying the action and its inputs.
 * @return Timestamp or span output, or an error output.
 */
function handleTime(args: JsonValue): ToolOutput {
  const action = readString(args, 'action');
  if (!isTimeAction(action)) {
    return failure(
      'time requires "action" to be one of now, parse, format, add, diff',
    );
  }
  const format = readString(args, 'format');
  const timeZone = readString(args, 'timeZone');
  const locale = readString(args, 'locale');
  const options = {
    ...(format === undefined ? {} : {format}),
    ...(timeZone === undefined ? {} : {timeZone}),
    ...(locale === undefined ? {} : {locale}),
  };
  try {
    switch (action) {
      case 'now':
        return point('now', describeTime(new Date(), options));
      case 'parse':
      case 'format': {
        const value = readString(args, 'value');
        if (value === undefined) {
          return failure(`time ${action} requires a "value" timestamp`);
        }
        return point(action, describeTime(parseTime(value), options));
      }
      case 'add': {
        const value = readString(args, 'value');
        const duration = readString(args, 'duration');
        if (value === undefined || duration === undefined) {
          return failure('time add requires "value" and "duration"');
        }
        return point('add', describeTime(addTime(value, duration), options));
      }
      case 'diff': {
        const from = readString(args, 'from');
        const to = readString(args, 'to');
        if (from === undefined || to === undefined) {
          return failure('time diff requires "from" and "to"');
        }
        const span = diffTime(from, to);
        return success(span.human, toJson({action: 'diff', span}));
      }
    }
  } catch (cause) {
    return failure(
      `time: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

/**
 * @brief Wraps a time point into a tool output.
 *
 * @param action Action that produced the point.
 * @param point Timestamp representations.
 * @return A successful tool output.
 */
function point(
  action: TimeAction,
  point: ReturnType<typeof describeTime>,
): ToolOutput {
  return success(point.formatted ?? point.iso, toJson({action, point}));
}

/**
 * @brief Checks whether a value is a supported time action.
 *
 * @param value Candidate action.
 * @return True when the action is recognized.
 */
function isTimeAction(value: string | undefined): value is TimeAction {
  return (
    value === 'now' ||
    value === 'parse' ||
    value === 'format' ||
    value === 'add' ||
    value === 'diff'
  );
}

/**
 * @brief Reads a string field from tool arguments.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name.
 * @return The string when present, otherwise `undefined`.
 */
function readString(args: JsonValue, key: string): string | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return undefined;
  }
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
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
