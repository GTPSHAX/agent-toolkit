/**
 * @fileoverview Types for the CSV tool.
 */

import type {JsonValue} from './common.js';

/** Direction of a CSV conversion. */
export type CsvMode = 'parse' | 'stringify';

/** Parsed CSV data as an array of row objects. */
export interface CsvTable {
  /** Header names taken from the first row. */
  readonly columns: readonly string[];
  /** Row objects keyed by column name. */
  readonly rows: readonly Record<string, string>[];
  /** Total number of data rows, excluding the header. */
  readonly rowCount: number;
}

/** Result of a CSV parse or stringify operation. */
export interface CsvResult {
  /** Direction that was performed. */
  readonly mode: CsvMode;
  /** Field delimiter that was used. */
  readonly delimiter: string;
  /** Parsed table, present in `parse` mode. */
  readonly table?: CsvTable;
  /** Serialized CSV text, present in `stringify` mode. */
  readonly text?: string;
  /** Raw data used by `stringify`, echoed for reference. */
  readonly data?: JsonValue;
}
