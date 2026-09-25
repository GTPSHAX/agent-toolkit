/**
 * @fileoverview UUID generation and validation helpers (RFC 9562).
 */

import {randomUUID} from 'node:crypto';

import type {UuidValidation, UuidVersion} from '../types/uuid.js';

/** Strict hex-and-dash form with 8-4-4-4-12 groups. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Nil UUID: all 128 bits zero (RFC 9562, Section 5.9). */
export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

/** Max UUID: all 128 bits one (RFC 9562, Section 5.10). */
export const MAX_UUID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

/** Variant names keyed by the high nibble of octet 8. */
const VARIANTS: Readonly<Record<string, string>> = {
  '0': 'ncs',
  '1': 'ncs',
  '2': 'ncs',
  '3': 'ncs',
  '4': 'ncs',
  '5': 'ncs',
  '6': 'ncs',
  '7': 'ncs',
  '8': 'rfc9562',
  '9': 'rfc9562',
  a: 'rfc9562',
  b: 'rfc9562',
  c: 'microsoft',
  d: 'microsoft',
  e: 'future',
  f: 'future',
};

/**
 * @brief Generates a version 4 (random) UUID.
 *
 * @param upper Return the identifier in uppercase.
 * @return A new UUIDv4 string.
 */
export function generateUuid(upper = false): string {
  const value = randomUUID();
  return upper ? value.toUpperCase() : value;
}

/**
 * @brief Validates and describes a UUID string.
 *
 * @param value Candidate UUID.
 * @return Validation result with normalized form, version, and variant.
 */
export function validateUuid(value: string): UuidValidation {
  const trimmed = value.trim();
  if (!UUID_PATTERN.test(trimmed)) {
    return {valid: false, error: 'not a hex-and-dash UUID string'};
  }
  const normalized = trimmed.toLowerCase();
  const variant = VARIANTS[normalized[19] ?? ''];
  const versionDigit = Number.parseInt(normalized[14] ?? '', 16);
  const result: UuidValidation = {valid: true, normalized};
  if (variant === 'rfc9562' && versionDigit >= 1 && versionDigit <= 8) {
    return {
      ...result,
      variant,
      version: versionDigit as UuidVersion,
    };
  }
  return variant === undefined ? result : {...result, variant};
}
