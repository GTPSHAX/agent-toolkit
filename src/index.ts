/**
 * @fileoverview Library entry point of the toolkit.
 */

import {echoTool} from './tools/executor.js';
import {hashTool} from './tools/hash.js';
import {jsonFormatTool} from './tools/json-format.js';
import {textStatsTool} from './tools/text-stats.js';
import type {ToolDefinition} from './types/tools.js';

export {createConfig, defaultConfig} from './core/config.js';
export {ToolkitError} from './core/errors.js';
export {createLogger, type Logger, type LogSink} from './core/logger.js';
export {
  createRegistry,
  DEFAULT_HASH_ALGORITHM,
  echoTool,
  executeTool,
  failure,
  getTool,
  hashTool,
  jsonFormatTool,
  listTools,
  success,
  textStatsTool,
  type ToolRegistry,
} from './tools/index.js';
export {
  center,
  computeTextStats,
  CRYPTO_HASH_ALGORITHMS,
  cryptoHash,
  DEFAULT_INDENT,
  formatJson,
  HASH_ALGORITHMS,
  hashText,
  isHashAlgorithm,
  MAX_INDENT,
  parseArgv,
  PROTON_HASH_ALGORITHMS,
  PROTON_HASH_SEED,
  protonHash,
  protonHash64,
  quote,
  repeatChar,
  truncate,
  type JsonFormatResult,
  type ParsedArgv,
} from './utils/index.js';
export type {
  ContentItem,
  CryptoHashAlgorithm,
  ExecuteOptions,
  HashAlgorithm,
  JsonFormatOptions,
  JsonObject,
  JsonPrimitive,
  JsonSchema,
  JsonValue,
  LogLevel,
  ProtonHashAlgorithm,
  TextContent,
  TextStats,
  ToolkitConfig,
  ToolContext,
  ToolDefinition,
  ToolHandler,
  ToolInfo,
  ToolOutput,
} from './types/index.js';

/**
 * @brief Built-in tools shipped with the toolkit.
 *
 * @return A fresh list of tool definitions.
 */
export function defaultTools(): ToolDefinition[] {
  return [echoTool(), textStatsTool(), jsonFormatTool(), hashTool()];
}
