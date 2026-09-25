/**
 * @fileoverview Types for UUID tools.
 */

/** A UUID in the RFC 9562 hex-and-dash textual form. */
export type UuidString = string;

/** Version field of a variant-10xx UUID. */
export type UuidVersion = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Result of validating a UUID string. */
export interface UuidValidation {
  /** Whether the input matches the hex-and-dash form. */
  readonly valid: boolean;
  /** Canonical lowercase form when valid. */
  readonly normalized?: UuidString;
  /** Version field when the variant is the RFC 9562 variant. */
  readonly version?: UuidVersion;
  /** Variant field name when recognized. */
  readonly variant?: string;
  /** Reason the input was rejected. */
  readonly error?: string;
}
