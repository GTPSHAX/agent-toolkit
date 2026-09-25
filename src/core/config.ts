/**
 * @fileoverview Runtime configuration loading and validation.
 */

import type {LogLevel, ToolkitConfig} from '../types/config.js';

/** All supported log levels, ordered from least to most verbose. */
const LOG_LEVELS: readonly LogLevel[] = [
  'silent',
  'error',
  'warn',
  'info',
  'debug',
];

/** Log level used when no override is supplied. */
export const DEFAULT_LOG_LEVEL: LogLevel = 'info';

/**
 * @brief Checks whether a value is a supported log level.
 *
 * @param value Candidate value of unknown origin.
 * @return True when `value` is a valid {@link LogLevel}.
 */
export function isLogLevel(value: unknown): value is LogLevel {
  return (
    typeof value === 'string' &&
    (LOG_LEVELS as readonly string[]).includes(value)
  );
}

/**
 * @brief Creates a validated, frozen toolkit configuration.
 *
 * @param overrides Partial configuration; unspecified fields fall back to
 *   defaults.
 * @return A frozen configuration object.
 * @throws RangeError When `logLevel` is not a supported level.
 */
export function createConfig(
  overrides: Partial<ToolkitConfig> = {},
): ToolkitConfig {
  const logLevel = overrides.logLevel ?? DEFAULT_LOG_LEVEL;
  if (!isLogLevel(logLevel)) {
    throw new RangeError(`Invalid log level: ${String(logLevel)}`);
  }
  return Object.freeze({logLevel});
}

/** Default configuration applied when none is supplied. */
export const defaultConfig: ToolkitConfig = createConfig();
