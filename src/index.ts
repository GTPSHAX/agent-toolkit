/**
 * @fileoverview Library entry point of the toolkit.
 */

import {base64Tool} from './tools/base64.js';
import {echoTool} from './tools/executor.js';
import {hashTool} from './tools/hash.js';
import {binaryTool, hexTool} from './tools/hex-binary.js';
import {jsonFormatTool} from './tools/json-format.js';
import {jwtTool} from './tools/jwt.js';
import {morseTool, rot13Tool} from './tools/rot13-morse.js';
import {textStatsTool} from './tools/text-stats.js';
import {htmlTool, urlTool} from './tools/url-html.js';
import type {ToolDefinition} from './types/tools.js';

export {createConfig, defaultConfig} from './core/config.js';
export {ToolkitError} from './core/errors.js';
export {createLogger, type Logger, type LogSink} from './core/logger.js';
export {
  BASE64_TOOL_NAME,
  BINARY_TOOL_NAME,
  DEFAULT_HASH_ALGORITHM,
  HEX_TOOL_NAME,
  HTML_TOOL_NAME,
  JWT_TOOL_NAME,
  MORSE_TOOL_NAME,
  ROT13_TOOL_NAME,
  URL_TOOL_NAME,
  base64Tool,
  binaryTool,
  createRegistry,
  echoTool,
  executeTool,
  failure,
  getTool,
  hashTool,
  hexTool,
  htmlTool,
  jsonFormatTool,
  jwtTool,
  listTools,
  morseTool,
  rot13Tool,
  success,
  textStatsTool,
  urlTool,
  type ToolRegistry,
} from './tools/index.js';
export {
  base64Decode,
  base64Encode,
  binaryDecode,
  binaryEncode,
  center,
  computeTextStats,
  CRYPTO_HASH_ALGORITHMS,
  cryptoHash,
  decodeJwt,
  DEFAULT_INDENT,
  formatJson,
  HASH_ALGORITHMS,
  hashText,
  hexDecode,
  hexEncode,
  htmlDecode,
  htmlEncode,
  isHashAlgorithm,
  MAX_INDENT,
  MORSE_WORD_SEPARATOR,
  morseDecode,
  morseEncode,
  parseArgv,
  PROTON_HASH_ALGORITHMS,
  PROTON_HASH_SEED,
  protonHash,
  protonHash64,
  quote,
  repeatChar,
  rot13,
  truncate,
  urlDecode,
  urlEncode,
  type JsonFormatResult,
  type ParsedArgv,
} from './utils/index.js';
export type {
  CodecMode,
  ContentItem,
  CryptoHashAlgorithm,
  EncodingFormat,
  ExecuteOptions,
  HashAlgorithm,
  JsonFormatOptions,
  JsonObject,
  JsonPrimitive,
  JsonSchema,
  JsonValue,
  JwtParts,
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
  return [
    echoTool(),
    textStatsTool(),
    jsonFormatTool(),
    hashTool(),
    base64Tool(),
    hexTool(),
    binaryTool(),
    urlTool(),
    htmlTool(),
    rot13Tool(),
    morseTool(),
    jwtTool(),
  ];
}
