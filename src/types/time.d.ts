/**
 * @fileoverview Types for the time tool.
 */

/** Operation performed by the time tool. */
export type TimeAction = 'now' | 'parse' | 'format' | 'add' | 'diff';

/** A timestamp rendered in several representations. */
export interface TimePoint {
  /** ISO 8601 UTC string, e.g. `2026-09-26T10:00:00.000Z`. */
  readonly iso: string;
  /** Unix time in seconds. */
  readonly epochSeconds: number;
  /** Unix time in milliseconds. */
  readonly epochMs: number;
  /** RFC 2822 / HTTP date string. */
  readonly http: string;
  /** Calendar date in `YYYY-MM-DD`. */
  readonly date: string;
  /** Time of day in `HH:MM:SS` (UTC). */
  readonly time: string;
  /** Value formatted with the requested format and zone, when provided. */
  readonly formatted?: string;
  /** Day of week name. */
  readonly weekday?: string;
  /** Week number of the year. */
  readonly week?: number;
}

/** Duration between two timestamps. */
export interface TimeSpan {
  /** Signed difference in milliseconds (`to` minus `from`). */
  readonly milliseconds: number;
  /** Signed difference in seconds. */
  readonly seconds: number;
  /** Signed difference in minutes. */
  readonly minutes: number;
  /** Signed difference in hours. */
  readonly hours: number;
  /** Signed difference in whole days. */
  readonly days: number;
  /** ISO 8601 duration, e.g. `P1DT2H30M`. */
  readonly iso: string;
  /** Human-readable summary, e.g. `1 day, 2 hours`. */
  readonly human: string;
}

/** Result of a time operation. */
export interface TimeResult {
  /** Operation that was performed. */
  readonly action: TimeAction;
  /** Resulting timestamp, present for `now`, `parse`, `format`, and `add`. */
  readonly point?: TimePoint;
  /** Difference, present for `diff`. */
  readonly span?: TimeSpan;
  /** Error message when an input could not be parsed. */
  readonly error?: string;
}
