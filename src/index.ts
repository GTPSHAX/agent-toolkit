/**
 * @fileoverview Library entry point of the toolkit.
 */

import {echoTool} from './tools/executor.js';
import type {ToolDefinition} from './types/tools.js';

export {createConfig, defaultConfig} from './core/config.js';
export {ToolkitError} from './core/errors.js';
export {createLogger, type Logger, type LogSink} from './core/logger.js';
export {
  createRegistry,
  echoTool,
  executeTool,
  failure,
  getTool,
  listTools,
  success,
  type ToolRegistry,
} from './tools/index.js';
export {
  center,
  parseArgv,
  quote,
  repeatChar,
  truncate,
  type ParsedArgv,
} from './utils/index.js';
export type {
  ContentItem,
  ExecuteOptions,
  JsonObject,
  JsonPrimitive,
  JsonSchema,
  JsonValue,
  LogLevel,
  TextContent,
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
  return [echoTool()];
}
