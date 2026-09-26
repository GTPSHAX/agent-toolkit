/**
 * @fileoverview The built-in `path` tool.
 */

import type {JsonValue} from '../types/common.js';
import type {PathAction, PathPlatform, PathResult} from '../types/path.js';
import type {JsonSchema, ToolDefinition, ToolOutput} from '../types/tools.js';
import {DEFAULT_PATH_PLATFORM, parsePathParts, pathApi} from '../utils/path.js';
import {failure, success} from './executor.js';

/** Tool name. */
export const PATH_TOOL_NAME = 'path';

/** Output schema of the `path` tool. */
const PATH_OUTPUT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    action: {type: 'string'},
    platform: {type: 'string'},
    result: {},
    absolute: {type: 'boolean'},
  },
  required: ['action', 'platform', 'result'],
};

/**
 * @brief Creates the `path` tool.
 *
 * @return A tool definition for cross-platform path operations.
 */
export function pathTool(): ToolDefinition {
  return {
    name: PATH_TOOL_NAME,
    title: 'Path',
    description:
      'Joins, resolves, normalizes, compares, and parses file paths for ' +
      'POSIX or Windows flavors.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Operation to perform.',
          enum: [
            'join',
            'resolve',
            'normalize',
            'relative',
            'parse',
            'absolute',
            'basename',
            'dirname',
            'extname',
          ],
        },
        paths: {
          type: 'array',
          description: 'Path segments for join or resolve.',
        },
        path: {type: 'string', description: 'Single path for most actions.'},
        from: {type: 'string', description: 'Start path for relative.'},
        to: {type: 'string', description: 'Target path for relative.'},
        ext: {
          type: 'string',
          description: 'Extension to strip for basename.',
        },
        platform: {
          type: 'string',
          description: 'Path flavor; defaults to the host platform.',
          enum: ['posix', 'win32'],
        },
      },
      required: ['action'],
    },
    outputSchema: PATH_OUTPUT_SCHEMA,
    handler: handlePath,
  };
}

/**
 * @brief Handles a `path` invocation.
 *
 * @param args Arguments carrying the action and its inputs.
 * @return Path output, or an error output.
 */
function handlePath(args: JsonValue): ToolOutput {
  const action = readString(args, 'action');
  if (!isPathAction(action)) {
    return failure(
      'path requires "action" to be join, resolve, normalize, relative, ' +
        'parse, absolute, basename, dirname, or extname',
    );
  }
  const platform = readPlatform(args);
  const api = pathApi(platform);
  try {
    switch (action) {
      case 'join':
      case 'resolve': {
        const paths = readStringArray(args, 'paths');
        if (paths === undefined || paths.length === 0) {
          return failure(`path ${action} requires a non-empty "paths" array`);
        }
        const result =
          action === 'join' ? api.join(...paths) : api.resolve(...paths);
        return done({action, platform, result});
      }
      case 'relative': {
        const from = readString(args, 'from');
        const to = readString(args, 'to');
        if (from === undefined || to === undefined) {
          return failure('path relative requires "from" and "to"');
        }
        return done({action, platform, result: api.relative(from, to)});
      }
      case 'parse': {
        const path = readString(args, 'path');
        if (path === undefined) {
          return failure('path parse requires a "path" argument');
        }
        return done({action, platform, result: parsePathParts(path, platform)});
      }
      case 'absolute': {
        const path = readString(args, 'path');
        if (path === undefined) {
          return failure('path absolute requires a "path" argument');
        }
        return done({
          action,
          platform,
          result: String(api.isAbsolute(path)),
          absolute: api.isAbsolute(path),
        });
      }
      case 'basename': {
        const path = readString(args, 'path');
        if (path === undefined) {
          return failure('path basename requires a "path" argument');
        }
        const ext = readString(args, 'ext');
        return done({
          action,
          platform,
          result:
            ext === undefined ? api.basename(path) : api.basename(path, ext),
        });
      }
      case 'dirname':
      case 'normalize':
      case 'extname': {
        const path = readString(args, 'path');
        if (path === undefined) {
          return failure(`path ${action} requires a "path" argument`);
        }
        const result =
          action === 'dirname'
            ? api.dirname(path)
            : action === 'normalize'
              ? api.normalize(path)
              : api.extname(path);
        return done({action, platform, result});
      }
    }
  } catch (cause) {
    return failure(
      `path: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

/**
 * @brief Wraps a path result into a tool output.
 *
 * @param result Path result.
 * @return A successful tool output.
 */
function done(result: PathResult): ToolOutput {
  return success(
    typeof result.result === 'string'
      ? result.result
      : JSON.stringify(result.result),
    toJson(result),
  );
}

/**
 * @brief Checks whether a value is a supported path action.
 *
 * @param value Candidate action.
 * @return True when the action is recognized.
 */
function isPathAction(value: string | undefined): value is PathAction {
  return (
    value === 'join' ||
    value === 'resolve' ||
    value === 'normalize' ||
    value === 'relative' ||
    value === 'parse' ||
    value === 'absolute' ||
    value === 'basename' ||
    value === 'dirname' ||
    value === 'extname'
  );
}

/**
 * @brief Reads the requested platform, defaulting to the host.
 *
 * @param args Argument value of unknown shape.
 * @return The requested flavor or the host default.
 */
function readPlatform(args: JsonValue): PathPlatform {
  const value = readString(args, 'platform');
  if (value === 'posix' || value === 'win32') {
    return value;
  }
  return DEFAULT_PATH_PLATFORM;
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
 * @brief Reads a string-array field from tool arguments.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name.
 * @return The string array when valid, otherwise `undefined`.
 */
function readStringArray(args: JsonValue, key: string): string[] | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return undefined;
  }
  const value = args[key];
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
