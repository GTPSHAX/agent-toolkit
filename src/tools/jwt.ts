/**
 * @fileoverview The built-in `jwt` tool.
 */

import type {JsonValue} from '../types/common.js';
import type {ToolDefinition, ToolOutput} from '../types/tools.js';
import {decodeJwt} from '../utils/jwt.js';
import {readString} from './args.js';
import {failure, success} from './executor.js';

/** Tool name. */
export const JWT_TOOL_NAME = 'jwt';

/**
 * @brief Creates the `jwt` tool.
 *
 * @return A tool definition that decodes a JSON Web Token.
 */
export function jwtTool(): ToolDefinition {
  return {
    name: JWT_TOOL_NAME,
    title: 'JWT decode',
    description:
      'Decodes a JSON Web Token header and payload without verifying the signature.',
    inputSchema: {
      type: 'object',
      properties: {
        token: {type: 'string', description: 'Compact JWS token.'},
      },
      required: ['token'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        header: {type: 'object'},
        payload: {type: 'object'},
        signature: {type: 'string'},
      },
      required: ['header', 'payload', 'signature'],
    },
    handler: handleJwt,
  };
}

/**
 * @brief Handles a `jwt` invocation.
 *
 * @param args Arguments carrying the `token` string.
 * @return Decoded parts, or an error output when the token is malformed.
 */
function handleJwt(args: JsonValue): ToolOutput {
  const token = readString(args, 'token');
  if (token === undefined) {
    return failure('jwt requires a "token" string argument');
  }
  try {
    const parts = decodeJwt(token);
    return success(JSON.stringify(parts), parts);
  } catch (cause) {
    return failure(`jwt: ${cause instanceof Error ? cause.message : cause}`);
  }
}
