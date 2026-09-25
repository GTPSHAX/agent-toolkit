/**
 * @fileoverview The built-in `hash` tool.
 */

import type {JsonValue} from '../types/common.js';
import type {HashAlgorithm} from '../types/hash.js';
import type {ToolDefinition, ToolOutput} from '../types/tools.js';
import {HASH_ALGORITHMS, hashText, isHashAlgorithm} from '../utils/hash.js';
import {failure, success} from './executor.js';

/** Tool name. */
export const HASH_TOOL_NAME = 'hash';

/** Algorithm applied when the caller does not choose one. */
export const DEFAULT_HASH_ALGORITHM: HashAlgorithm = 'sha256';

/**
 * @brief Creates the `hash` tool.
 *
 * @return A tool definition that hashes a text value.
 */
export function hashTool(): ToolDefinition {
  return {
    name: HASH_TOOL_NAME,
    title: 'Hash',
    description:
      'Hashes text with MD5, SHA-1, SHA-256, SHA-512, or ProtonHash.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {type: 'string', description: 'Text to hash.'},
        algorithm: {
          type: 'string',
          description: 'Hash algorithm to use.',
          enum: [...HASH_ALGORITHMS],
        },
      },
      required: ['text'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        algorithm: {type: 'string'},
        digest: {type: 'string'},
      },
      required: ['algorithm', 'digest'],
    },
    handler: handleHash,
  };
}

/**
 * @brief Handles a `hash` invocation.
 *
 * @param args Arguments carrying `text` and an optional `algorithm`.
 * @return Digest output, or an error output for invalid arguments.
 */
function handleHash(args: JsonValue): ToolOutput {
  const text = readString(args, 'text');
  if (text === undefined) {
    return failure('hash requires a "text" string argument');
  }
  const algorithm = readAlgorithm(args);
  if (algorithm === undefined) {
    return failure(
      `hash: unknown algorithm (use ${HASH_ALGORITHMS.join(', ')})`,
    );
  }
  const digest = hashText(text, algorithm);
  return success(digest, {algorithm, digest});
}

/**
 * @brief Reads the requested algorithm, defaulting when absent.
 *
 * @param args Argument value of unknown shape.
 * @return A valid algorithm, or `undefined` when the value is invalid.
 */
function readAlgorithm(args: JsonValue): HashAlgorithm | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return DEFAULT_HASH_ALGORITHM;
  }
  const value = args['algorithm'];
  if (value === undefined) {
    return DEFAULT_HASH_ALGORITHM;
  }
  return isHashAlgorithm(value) ? value : undefined;
}

/**
 * @brief Reads a string field from a tool argument value.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name to read.
 * @return The string when present and valid, otherwise `undefined`.
 */
function readString(args: JsonValue, key: string): string | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return undefined;
  }
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
}
