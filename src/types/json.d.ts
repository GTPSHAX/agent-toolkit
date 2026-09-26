/**
 * @fileoverview Types for JSON tools.
 */

import type {JsonValue} from './common.js';

/** Options accepted by the JSON formatter. */
export interface JsonFormatOptions {
  /** Space indentation; zero produces compact output. */
  readonly indent?: number;
  /** Sort object keys recursively. */
  readonly sortKeys?: boolean;
}

/** One value selected by a JSON path. */
export interface JsonQueryMatch {
  /** Canonical path of the selected value. */
  readonly path: string;
  /** Selected value. */
  readonly value: JsonValue;
}

/** Result of evaluating a JSON path. */
export interface JsonQueryResult {
  /** JSON path that was evaluated. */
  readonly query: string;
  /** Number of selected values. */
  readonly count: number;
  /** Selected values in document order. */
  readonly matches: readonly JsonQueryMatch[];
  /** The single selected value when exactly one match exists. */
  readonly value?: JsonValue;
  /** Parse or path error message. */
  readonly error?: string;
}
