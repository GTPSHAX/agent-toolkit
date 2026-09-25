/**
 * @fileoverview Types for encoding and decoding tools.
 */

import type {JsonValue} from './common.js';

/** Direction of a reversible encoding operation. */
export type CodecMode = 'encode' | 'decode';

/** The supported encoding families exposed as tools. */
export type EncodingFormat =
  | 'base64'
  | 'url'
  | 'html'
  | 'hex'
  | 'binary'
  | 'rot13'
  | 'morse'
  | 'jwt';

/** Decoded parts of a JSON Web Token, without signature verification. */
export interface JwtParts extends Record<string, JsonValue> {
  /** Decoded JOSE header. */
  readonly header: JsonValue;
  /** Decoded payload claims. */
  readonly payload: JsonValue;
  /** Raw encoded signature segment; empty for unsecured tokens. */
  readonly signature: string;
}
