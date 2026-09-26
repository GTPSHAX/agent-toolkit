/**
 * @fileoverview File hashing and encoding helpers with path guarding.
 */

import {createHash} from 'node:crypto';
import {existsSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import type {CodecMode} from '../types/encoding.js';
import type {FileEncoding, HashFileResult} from '../types/file.js';
import type {HashAlgorithm} from '../types/hash.js';
import {isHashAlgorithm, protonHash, protonHash64} from './hash.js';

/** Default cap on encoded text returned from a file. */
export const DEFAULT_FILE_MAX_LENGTH = 20000;

/**
 * @brief Resolves and validates a file path.
 *
 * @param path Absolute or relative path.
 * @return The resolved absolute path.
 * @throws Error When the path is empty or cannot be resolved.
 */
export function resolveFilePath(path: string): string {
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw new Error('path must be a non-empty string');
  }
  return resolve(path);
}

/**
 * @brief Reads a file's bytes.
 *
 * @param path Path to read.
 * @return The file contents.
 * @throws Error When the path is not an existing regular file.
 */
export function readFileBytes(path: string): Buffer {
  const target = resolveFilePath(path);
  let stats;
  try {
    stats = statSync(target);
  } catch {
    throw new Error(`file not found: ${target}`);
  }
  if (!stats.isFile()) {
    throw new Error(`not a regular file: ${target}`);
  }
  return readFileSync(target);
}

/**
 * @brief Hashes a file with any supported algorithm.
 *
 * Cryptographic algorithms stream the file through `node:crypto`; the
 * ProtonHash variants operate on the file's UTF-8 text.
 *
 * @param path Path to read.
 * @param algorithm Algorithm name.
 * @return The digest and byte size.
 * @throws Error When the path is missing, not a file, or the algorithm is
 *   unsupported.
 */
export function hashFile(
  path: string,
  algorithm: HashAlgorithm,
): HashFileResult {
  if (!isHashAlgorithm(algorithm)) {
    throw new Error(`unsupported algorithm "${algorithm}"`);
  }
  const target = resolveFilePath(path);
  const bytes = readFileBytes(target);
  return {
    path: target,
    algorithm,
    digest: digest(bytes, algorithm),
    bytes: bytes.length,
  };
}

/**
 * @brief Encodes or decodes a file between raw bytes and text.
 *
 * @param path Path to read.
 * @param format Encoding family.
 * @param mode Direction of the operation.
 * @param options Output path, overwrite flag, and text limits.
 * @return Encoded text, or details of the written file.
 * @throws Error When the input is invalid, the output exists, or the path is
 *   unusable.
 */
export function codecFile(
  path: string,
  format: FileEncoding,
  mode: CodecMode,
  options: {
    output?: string;
    overwrite?: boolean;
    maxLength?: number;
  } = {},
): {
  path: string;
  format: FileEncoding;
  mode: CodecMode;
  bytesIn: number;
  text?: string;
  output?: string;
  bytesOut?: number;
  created?: boolean;
} {
  const bytes = readFileBytes(path);
  const target = resolveFilePath(path);
  if (mode === 'encode') {
    const text = encodeBytes(bytes, format)
      .slice(0, options.maxLength ?? DEFAULT_FILE_MAX_LENGTH)
      .trim();
    return {path: target, format, mode, bytesIn: bytes.length, text};
  }
  const decoded = decodeText(bytes.toString('utf8'), format);
  const output = resolveFilePath(options.output ?? '');
  if (existsSync(output) && options.overwrite !== true) {
    throw new Error(`output exists: ${output} (pass overwrite: true)`);
  }
  const created = !existsSync(output);
  writeFileSync(output, decoded);
  return {
    path: target,
    format,
    mode,
    bytesIn: bytes.length,
    output,
    bytesOut: decoded.length,
    created,
  };
}

/**
 * @brief Computes a digest for a byte buffer.
 *
 * @param bytes File bytes.
 * @param algorithm Algorithm name.
 * @return Hex digest, or decimal string for the ProtonHash variants.
 */
function digest(bytes: Buffer, algorithm: HashAlgorithm): string {
  switch (algorithm) {
    case 'md5':
    case 'sha1':
    case 'sha256':
    case 'sha512':
      return createHash(algorithm).update(bytes).digest('hex');
    case 'protonhash':
      return protonHash(bytes.toString('utf8')).toString(16).padStart(8, '0');
    case 'protonhash64':
      return protonHash64(bytes.toString('utf8'));
  }
}

/**
 * @brief Encodes bytes as text for the given format.
 *
 * @param bytes Raw bytes.
 * @param format Encoding family.
 * @return Encoded text broken into lines.
 */
function encodeBytes(bytes: Buffer, format: FileEncoding): string {
  if (format === 'base64') {
    return bytes.toString('base64');
  }
  return wrapHex(bytes.toString('hex'));
}

/**
 * @brief Decodes text into bytes for the given format.
 *
 * @param text Encoded text.
 * @param format Encoding family.
 * @return Decoded bytes.
 * @throws Error When the input is not valid for the format.
 */
function decodeText(text: string, format: FileEncoding): Buffer {
  const compact = text.replace(/\s+/g, '');
  if (format === 'base64') {
    return Buffer.from(compact, 'base64');
  }
  if (!/^[0-9a-fA-F]*$/.test(compact) || compact.length % 2 !== 0) {
    throw new Error('invalid hex input');
  }
  return Buffer.from(compact, 'hex');
}

/**
 * @brief Wraps a hex string at 64 characters per line.
 *
 * @param hex Hex string.
 * @return Wrapped hex text.
 */
function wrapHex(hex: string): string {
  return hex.replace(/(.{64})/g, '$1\n');
}
