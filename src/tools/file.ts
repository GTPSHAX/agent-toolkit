/**
 * @fileoverview The built-in file hashing and encoding tools.
 */

import type {JsonValue} from '../types/common.js';
import type {CodecMode} from '../types/encoding.js';
import type {FileEncoding} from '../types/file.js';
import type {HashAlgorithm} from '../types/hash.js';
import type {JsonSchema, ToolDefinition, ToolOutput} from '../types/tools.js';
import {codecFile, hashFile} from '../utils/file.js';
import {HASH_ALGORITHMS, isHashAlgorithm} from '../utils/hash.js';
import {failure, success} from './executor.js';

/** File hash tool name. */
export const HASH_FILE_TOOL_NAME = 'hash.file';
/** File base64 tool name. */
export const BASE64_FILE_TOOL_NAME = 'base64.file';
/** File hex tool name. */
export const HEX_FILE_TOOL_NAME = 'hex.file';

/** Output schema shared by the file codec tools. */
const CODEC_FILE_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    path: {type: 'string'},
    format: {type: 'string'},
    mode: {type: 'string'},
    bytesIn: {type: 'number'},
    text: {type: 'string'},
    output: {type: 'string'},
    bytesOut: {type: 'number'},
    created: {type: 'boolean'},
  },
  required: ['path', 'format', 'mode', 'bytesIn'],
};

/**
 * @brief Creates the `hash.file` tool.
 *
 * @return A tool definition that hashes a file without loading it into context.
 */
export function hashFileTool(): ToolDefinition {
  return {
    name: HASH_FILE_TOOL_NAME,
    title: 'Hash file',
    description:
      'Hashes a file by path and returns only its digest and byte size.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {type: 'string', description: 'Path to the file.'},
        algorithm: {
          type: 'string',
          description: 'Hash algorithm; defaults to sha256.',
          enum: [...HASH_ALGORITHMS],
        },
      },
      required: ['path'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        path: {type: 'string'},
        algorithm: {type: 'string'},
        digest: {type: 'string'},
        bytes: {type: 'number'},
      },
      required: ['path', 'algorithm', 'digest', 'bytes'],
    },
    handler: handleHashFile,
  };
}

/**
 * @brief Creates the `base64.file` tool.
 *
 * @return A tool definition that base64-encodes or decodes a file.
 */
export function base64FileTool(): ToolDefinition {
  return codecFileTool(
    BASE64_FILE_TOOL_NAME,
    'base64',
    'Base64-encodes a file, or decodes one into an output file.',
  );
}

/**
 * @brief Creates the `hex.file` tool.
 *
 * @return A tool definition that hex-encodes or decodes a file.
 */
export function hexFileTool(): ToolDefinition {
  return codecFileTool(
    HEX_FILE_TOOL_NAME,
    'hex',
    'Hex-encodes a file, or decodes one into an output file.',
  );
}

/**
 * @brief Builds a file codec tool for one encoding family.
 *
 * @param name Tool name.
 * @param format Encoding family.
 * @param description Human-readable description.
 * @return A tool definition that encodes or decodes a file.
 */
function codecFileTool(
  name: string,
  format: FileEncoding,
  description: string,
): ToolDefinition {
  return {
    name,
    title: `File ${format}`,
    description,
    inputSchema: {
      type: 'object',
      properties: {
        path: {type: 'string', description: 'Path to the input file.'},
        mode: {
          type: 'string',
          description: 'encode reads the file; decode writes it.',
          enum: ['encode', 'decode'],
        },
        output: {
          type: 'string',
          description: 'Output path; required for decode.',
        },
        overwrite: {
          type: 'boolean',
          description: 'Allow overwriting an existing output file.',
        },
        maxLength: {
          type: 'number',
          description: 'Maximum characters returned.',
        },
      },
      required: ['path', 'mode'],
    },
    outputSchema: CODEC_FILE_SCHEMA,
    handler: handleCodecFile(format),
  };
}

/**
 * @brief Handles a `hash.file` invocation.
 *
 * @param args Arguments carrying the path and algorithm.
 * @return Digest output, or an error output.
 */
function handleHashFile(args: JsonValue): ToolOutput {
  const path = readString(args, 'path');
  if (path === undefined) {
    return failure('hash.file requires a "path" string argument');
  }
  const requested = readString(args, 'algorithm');
  const algorithm: HashAlgorithm = isHashAlgorithm(requested)
    ? requested
    : 'sha256';
  try {
    const result = hashFile(path, algorithm);
    return success(JSON.stringify(result), toJson(result));
  } catch (cause) {
    return failure(`hash.file: ${errorMessage(cause)}`);
  }
}

/**
 * @brief Builds a handler for a file codec tool.
 *
 * @param format Encoding family handled by the tool.
 * @return A handler that encodes or decodes a file.
 */
function handleCodecFile(
  format: FileEncoding,
): (args: JsonValue) => ToolOutput {
  return args => {
    const path = readString(args, 'path');
    const mode = readMode(args);
    if (path === undefined || mode === undefined) {
      return failure(`${format}.file requires "path" and "mode" arguments`);
    }
    const output = readString(args, 'output');
    if (mode === 'decode' && output === undefined) {
      return failure(`${format}.file decode requires an "output" path`);
    }
    const overwrite = readBoolean(args, 'overwrite');
    const maxLength = readNumber(args, 'maxLength');
    try {
      const result = codecFile(path, format, mode, {
        ...(output === undefined ? {} : {output}),
        ...(overwrite === undefined ? {} : {overwrite}),
        ...(maxLength === undefined ? {} : {maxLength}),
      });
      return success(formatCodec(result), toJson(result));
    } catch (cause) {
      return failure(`${format}.file: ${errorMessage(cause)}`);
    }
  };
}

/**
 * @brief Renders a file codec result as readable text.
 *
 * @param result Codec result.
 * @return Encoded text, or a summary of the written file.
 */
function formatCodec(result: {
  mode: CodecMode;
  output?: string;
  bytesOut?: number;
  created?: boolean;
  text?: string;
}): string {
  if (result.mode === 'encode') {
    return result.text ?? '';
  }
  const verb = result.created === true ? 'created' : 'overwrote';
  return `${verb} ${result.output ?? ''} (${result.bytesOut ?? 0} bytes)`;
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
 * @brief Reads a boolean field from tool arguments.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name.
 * @return The boolean when present, otherwise `undefined`.
 */
function readBoolean(args: JsonValue, key: string): boolean | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return undefined;
  }
  const value = args[key];
  return typeof value === 'boolean' ? value : undefined;
}

/**
 * @brief Reads a number field from tool arguments.
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
 * @brief Reads the `mode` field from tool arguments.
 *
 * @param args Argument value of unknown shape.
 * @return The mode when valid, otherwise `undefined`.
 */
function readMode(args: JsonValue): CodecMode | undefined {
  const value = readString(args, 'mode');
  return value === 'encode' || value === 'decode' ? value : undefined;
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

/**
 * @brief Extracts a message from an unknown thrown value.
 *
 * @param cause Thrown value.
 * @return Human-readable message.
 */
function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
