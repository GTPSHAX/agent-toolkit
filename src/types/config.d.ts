/**
 * @fileoverview Toolkit configuration types.
 */

/** Supported log verbosity levels, ordered from least to most verbose. */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

/** Runtime configuration for the toolkit. */
export interface ToolkitConfig {
  /** Minimum level that gets emitted. Defaults to `'info'`. */
  readonly logLevel: LogLevel;
}
