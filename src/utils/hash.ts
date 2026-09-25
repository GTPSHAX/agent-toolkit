/**
 * @fileoverview Hashing helpers, including the ProtonHash algorithm.
 */

import {createHash} from 'node:crypto';

import type {
  CryptoHashAlgorithm,
  HashAlgorithm,
  ProtonHashAlgorithm,
} from '../types/hash.js';

/** Initial value of the ProtonHash accumulator. */
export const PROTON_HASH_SEED = 0x55555555;

/** Supported cryptographic algorithms. */
export const CRYPTO_HASH_ALGORITHMS: readonly CryptoHashAlgorithm[] = [
  'md5',
  'sha1',
  'sha256',
  'sha512',
];

/** Supported ProtonHash variants. */
export const PROTON_HASH_ALGORITHMS: readonly ProtonHashAlgorithm[] = [
  'protonhash',
  'protonhash64',
];

/**
 * @brief Computes a cryptographic digest of a UTF-8 string.
 *
 * @param text Input text.
 * @param algorithm Cryptographic algorithm to use.
 * @return Lowercase hexadecimal digest.
 */
export function cryptoHash(
  text: string,
  algorithm: CryptoHashAlgorithm,
): string {
  return createHash(algorithm).update(text, 'utf8').digest('hex');
}

/**
 * @brief Computes the 32-bit ProtonHash of a UTF-8 string.
 *
 * The accumulator starts at `0x55555555` and, for every input byte, becomes
 * `(hash >> 27) + (hash << 5) + byte` on unsigned 32-bit arithmetic.
 *
 * @param text Input text, hashed as its UTF-8 bytes.
 * @return Unsigned 32-bit hash value.
 */
export function protonHash(text: string): number {
  let hash = PROTON_HASH_SEED;
  for (const byte of Buffer.from(text, 'utf8')) {
    hash = ((hash >>> 27) + (hash << 5) + byte) >>> 0;
  }
  return hash;
}

/**
 * @brief Computes the big-integer ProtonHash variant of a string.
 *
 * Uses `BigInt` so the accumulator is not truncated to 32 bits, matching the
 * wide variant used for 64-bit identifiers.
 *
 * @param text Input text, hashed by UTF-16 code unit.
 * @return Hash as a decimal string.
 */
export function protonHash64(text: string): string {
  let hash = BigInt(PROTON_HASH_SEED);
  for (let index = 0; index < text.length; index++) {
    const code = BigInt(text.charCodeAt(index));
    hash = code + (hash >> BigInt(27)) + (hash << BigInt(5));
  }
  return hash.toString();
}

/**
 * @brief Hashes text with any supported algorithm.
 *
 * @param text Input text.
 * @param algorithm Algorithm name.
 * @return Hex digest for cryptographic algorithms, decimal string for the
 *   ProtonHash variants.
 */
export function hashText(text: string, algorithm: HashAlgorithm): string {
  switch (algorithm) {
    case 'md5':
    case 'sha1':
    case 'sha256':
    case 'sha512':
      return cryptoHash(text, algorithm);
    case 'protonhash':
      return protonHash(text).toString(16).padStart(8, '0');
    case 'protonhash64':
      return protonHash64(text);
  }
}

/**
 * @brief Checks whether a value is a supported hash algorithm.
 *
 * @param value Candidate value of unknown origin.
 * @return True when `value` names a supported algorithm.
 */
export function isHashAlgorithm(value: unknown): value is HashAlgorithm {
  return (
    typeof value === 'string' &&
    (
      [...CRYPTO_HASH_ALGORITHMS, ...PROTON_HASH_ALGORITHMS] as string[]
    ).includes(value)
  );
}

/** All supported algorithm names, in display order. */
export const HASH_ALGORITHMS: readonly HashAlgorithm[] = [
  ...CRYPTO_HASH_ALGORITHMS,
  ...PROTON_HASH_ALGORITHMS,
];
