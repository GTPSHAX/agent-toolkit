/**
 * @fileoverview Types for file hashing and encoding tools.
 */

import type {CodecMode} from './encoding.js';

/** Text encodings supported for file conversion. */
export type FileEncoding = 'base64' | 'hex';

/** Result of hashing a file. */
export interface HashFileResult {
  /** Resolved path that was read. */
  readonly path: string;
  /** Algorithm that was applied. */
  readonly algorithm: string;
  /** Digest in hex, or decimal for the ProtonHash variants. */
  readonly digest: string;
  /** Number of bytes read. */
  readonly bytes: number;
}

/** Result of encoding or decoding a file. */
export interface CodecFileResult {
  /** Resolved path that was read. */
  readonly path: string;
  /** Encoding family used. */
  readonly format: FileEncoding;
  /** Direction of the operation. */
  readonly mode: CodecMode;
  /** Number of bytes read from the source. */
  readonly bytesIn: number;
  /** Encoded text, present in `encode` mode. */
  readonly text?: string;
  /** Resolved path written in `decode` mode. */
  readonly output?: string;
  /** Number of bytes written. */
  readonly bytesOut?: number;
  /** Whether `output` was newly created rather than overwritten. */
  readonly created?: boolean;
}
