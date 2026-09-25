/**
 * @fileoverview Shared argument readers for tool handlers.
 */

import type {JsonValue} from '../types/common.js';
import type {CodecMode} from '../types/encoding.js';

/**
 * @brief Checks whether a value is a plain JSON object.
 *
 * @param args Candidate value of unknown origin.
 * @return True when `args` is a non-null, non-array object.
 */
export function isArgsObject(
  args: JsonValue,
): args is {[key: string]: JsonValue} {
  return args !== null && typeof args === 'object' && !Array.isArray(args);
}

/**
 * @brief Reads a string field from a tool argument value.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name to read.
 * @return The string when present and valid, otherwise `undefined`.
 */
export function readString(args: JsonValue, key: string): string | undefined {
  if (!isArgsObject(args)) {
    return undefined;
  }
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * @brief Reads a boolean field from a tool argument value.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name to read.
 * @return The boolean when present and valid, otherwise `undefined`.
 */
export function readBoolean(args: JsonValue, key: string): boolean | undefined {
  if (!isArgsObject(args)) {
    return undefined;
  }
  const value = args[key];
  return typeof value === 'boolean' ? value : undefined;
}

/**
 * @brief Reads the `mode` field from a tool argument value.
 *
 * @param args Argument value of unknown shape.
 * @return The mode when present and valid, otherwise `undefined`.
 */
export function readMode(args: JsonValue): CodecMode | undefined {
  const value = readString(args, 'mode');
  return value === 'encode' || value === 'decode' ? value : undefined;
}
