/**
 * @fileoverview JSON parsing and formatting helpers.
 */

import type {JsonFormatOptions, JsonValue} from '../types/index.js';

/** Result of formatting a JSON document. */
export interface JsonFormatResult {
  /** Whether the input parsed as JSON. */
  readonly valid: boolean;
  /** Formatted JSON text when valid; the original text otherwise. */
  readonly text: string;
  /** Parser error message when invalid. */
  readonly error?: string;
}

/** Indentation applied when `indent` is not provided. */
export const DEFAULT_INDENT = 2;

/** Maximum accepted indentation. */
export const MAX_INDENT = 10;

/**
 * @brief Parses and formats a JSON document.
 *
 * @param input JSON source text.
 * @param options Indentation and key-sorting options.
 * @return Formatting result; `valid` is false when parsing fails.
 */
export function formatJson(
  input: string,
  options: JsonFormatOptions = {},
): JsonFormatResult {
  let parsed: JsonValue;
  try {
    parsed = JSON.parse(input) as JsonValue;
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : String(cause);
    return {valid: false, text: input, error};
  }
  const indent = clampIndent(options.indent);
  const value = options.sortKeys ? sortKeysDeep(parsed) : parsed;
  const text = JSON.stringify(value, null, indent);
  return {valid: true, text};
}

/**
 * @brief Clamps an indentation value to the supported range.
 *
 * @param indent Requested indentation, if any.
 * @return Indentation between 0 and {@link MAX_INDENT}.
 */
function clampIndent(indent: number | undefined): number {
  const value = indent ?? DEFAULT_INDENT;
  if (!Number.isFinite(value)) {
    return DEFAULT_INDENT;
  }
  return Math.min(MAX_INDENT, Math.max(0, Math.trunc(value)));
}

/**
 * @brief Recursively sorts object keys while preserving array order.
 *
 * @param value JSON value to copy.
 * @return A copy with object keys sorted lexicographically.
 */
function sortKeysDeep(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, JsonValue> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(value[key] as JsonValue);
    }
    return sorted;
  }
  return value;
}
