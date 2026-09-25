/**
 * @fileoverview Leveled logger used by the toolkit library and CLI.
 */

import type {LogLevel, ToolkitConfig} from '../types/config.js';

/** Numeric severity used to compare a message level with the threshold. */
const SEVERITY: Readonly<Record<LogLevel, number>> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

/** Sink that receives fully formatted log lines. */
export type LogSink = (line: string) => void;

/** A leveled logger. */
export interface Logger {
  /** Level this logger emits at. */
  readonly level: LogLevel;
  /** Emits a debug message. */
  debug(message: string): void;
  /** Emits an informational message. */
  info(message: string): void;
  /** Emits a warning message. */
  warn(message: string): void;
  /** Emits an error message. */
  error(message: string): void;
}

/**
 * @brief Creates a leveled logger.
 *
 * Messages below the configured level are dropped; `'silent'` drops all output.
 *
 * @param config Configuration carrying the target log level.
 * @param sink Output function, defaults to writing to standard output.
 * @return A logger honouring the configured level.
 */
export function createLogger(
  config: ToolkitConfig,
  sink: LogSink = line => process.stdout.write(`${line}\n`),
): Logger {
  const threshold = SEVERITY[config.logLevel];
  const emit = (level: Exclude<LogLevel, 'silent'>, message: string): void => {
    if (SEVERITY[level] <= threshold) {
      sink(`[${level}] ${message}`);
    }
  };
  return {
    level: config.logLevel,
    debug: message => emit('debug', message),
    info: message => emit('info', message),
    warn: message => emit('warn', message),
    error: message => emit('error', message),
  };
}
