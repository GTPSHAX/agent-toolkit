/**
 * @fileoverview The built-in `uuid` tool.
 */

import type {JsonValue} from '../types/common.js';
import type {ToolDefinition, ToolOutput} from '../types/tools.js';
import {MAX_UUID, NIL_UUID, generateUuid, validateUuid} from '../utils/uuid.js';
import {readBoolean, readString} from './args.js';
import {failure, success} from './executor.js';

/** Tool name. */
export const UUID_TOOL_NAME = 'uuid';

/** Default number of identifiers generated per call. */
export const DEFAULT_UUID_COUNT = 1;

/** Upper bound on identifiers generated per call. */
export const MAX_UUID_COUNT = 100;

/**
 * @brief Creates the `uuid` tool.
 *
 * @return A tool definition that generates or validates UUIDs.
 */
export function uuidTool(): ToolDefinition {
  return {
    name: UUID_TOOL_NAME,
    title: 'UUID',
    description: 'Generates version 4 UUIDs or validates a UUID string.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Operation to perform.',
          enum: ['generate', 'validate'],
        },
        count: {
          type: 'number',
          description: 'Number of UUIDs to generate, 1 to 100.',
        },
        upper: {
          type: 'boolean',
          description: 'Return generated UUIDs in uppercase.',
        },
        value: {
          type: 'string',
          description: 'UUID string to validate.',
        },
      },
      required: ['action'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        action: {type: 'string'},
        uuids: {type: 'array'},
        valid: {type: 'boolean'},
        normalized: {type: 'string'},
        version: {type: 'number'},
        variant: {type: 'string'},
        nil: {type: 'string'},
        max: {type: 'string'},
      },
      required: ['action'],
    },
    handler: handleUuid,
  };
}

/**
 * @brief Handles a `uuid` invocation.
 *
 * @param args Arguments carrying `action` and its options.
 * @return Generated or validated output, or an error output.
 */
function handleUuid(args: JsonValue): ToolOutput {
  const action = readString(args, 'action');
  if (action === 'generate') {
    return handleGenerate(args);
  }
  if (action === 'validate') {
    return handleValidate(args);
  }
  return failure('uuid: "action" must be "generate" or "validate"');
}

/**
 * @brief Generates identifiers for a `generate` action.
 *
 * @param args Argument value of unknown shape.
 * @return Generated UUID list, or an error output.
 */
function handleGenerate(args: JsonValue): ToolOutput {
  const requested = readCount(args);
  if (requested === undefined || requested < 1 || requested > MAX_UUID_COUNT) {
    return failure(`uuid: "count" must be between 1 and ${MAX_UUID_COUNT}`);
  }
  const upper = readBoolean(args, 'upper') === true;
  const uuids = Array.from({length: requested}, () => generateUuid(upper));
  return success(uuids.join('\n'), {
    action: 'generate',
    uuids,
    nil: NIL_UUID,
    max: MAX_UUID,
  });
}

/**
 * @brief Validates a value for a `validate` action.
 *
 * @param args Argument value of unknown shape.
 * @return Validation result, or an error output.
 */
function handleValidate(args: JsonValue): ToolOutput {
  const value = readString(args, 'value');
  if (value === undefined) {
    return failure('uuid: "validate" requires a "value" string argument');
  }
  const validation = validateUuid(value);
  return success(JSON.stringify(validation), {
    action: 'validate',
    ...validation,
  });
}

/**
 * @brief Reads the requested generation count.
 *
 * @param args Argument value of unknown shape.
 * @return The count when supplied as a finite number, otherwise the default.
 */
function readCount(args: JsonValue): number | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return DEFAULT_UUID_COUNT;
  }
  const value = args['count'];
  if (value === undefined) {
    return DEFAULT_UUID_COUNT;
  }
  return typeof value === 'number' && Number.isInteger(value)
    ? value
    : undefined;
}
