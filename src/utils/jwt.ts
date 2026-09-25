/**
 * @fileoverview JSON Web Token decoding helpers.
 */

import type {JwtParts} from '../types/encoding.js';
import type {JsonValue} from '../types/common.js';

/**
 * @brief Decodes a JSON Web Token without verifying its signature.
 *
 * @param token Compact JWS string with three dot-separated segments.
 * @return Decoded header, payload, and raw signature.
 * @throws Error When the token is malformed or a segment is not JSON.
 */
export function decodeJwt(token: string): JwtParts {
  const segments = token.trim().split('.');
  if (segments.length !== 3) {
    throw new Error('expected three dot-separated segments');
  }
  const [headerSegment = '', payloadSegment = '', signature = ''] = segments;
  const header = decodeSegment(headerSegment, 'header');
  const payload = decodeSegment(payloadSegment, 'payload');
  return {header, payload, signature};
}

/**
 * @brief Decodes one Base64URL JSON segment of a token.
 *
 * @param segment Base64URL-encoded segment.
 * @param name Segment name used in error messages.
 * @return Parsed JSON value.
 * @throws Error When the segment is not valid Base64URL or JSON.
 */
function decodeSegment(segment: string, name: string): JsonValue {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) {
    throw new Error(`invalid ${name} segment`);
  }
  const json = Buffer.from(segment, 'base64url').toString('utf8');
  try {
    return JSON.parse(json) as JsonValue;
  } catch {
    throw new Error(`${name} segment is not valid JSON`);
  }
}
