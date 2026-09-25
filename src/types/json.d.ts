/**
 * @fileoverview Types for JSON tools.
 */

/** Options accepted by the JSON formatter. */
export interface JsonFormatOptions {
  /** Space indentation; zero produces compact output. */
  readonly indent?: number;
  /** Sort object keys recursively. */
  readonly sortKeys?: boolean;
}
