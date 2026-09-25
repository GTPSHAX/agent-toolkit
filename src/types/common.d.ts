/**
 * @fileoverview Shared primitive types used across the toolkit.
 */

/** A JSON primitive value. */
export type JsonPrimitive = string | number | boolean | null;

/**
 * @brief Any value that can be serialized to JSON.
 */
export type JsonValue =
  JsonPrimitive | JsonValue[] | {[key: string]: JsonValue};

/** A plain JSON object. */
export type JsonObject = {[key: string]: JsonValue};
