/**
 * @fileoverview Small, dependency-free text and argument helpers.
 */

/** Result of parsing a process argument list. */
export interface ParsedArgv {
  /** Leading positional token, interpreted as the command name. */
  readonly command?: string;
  /** Remaining positional tokens. */
  readonly positional: readonly string[];
  /** Long options, keyed without the leading dashes. */
  readonly options: Readonly<Record<string, string | boolean>>;
  /** Short option letters that were present. */
  readonly flags: readonly string[];
}

/**
 * @brief Parses an argument list into command, positionals, and options.
 *
 * Supports `--name`, `--name value`, `--name=value`, and `-a` style flags.
 * Everything after a `--` separator is treated as positional.
 *
 * @param argv Argument list, typically `process.argv.slice(2)`.
 * @return The structured argument values.
 */
export function parseArgv(argv: readonly string[]): ParsedArgv {
  const positional: string[] = [];
  const options: Record<string, string | boolean> = {};
  const flags: string[] = [];
  let afterSeparator = false;

  for (let index = 0; index < argv.length; index++) {
    const token = argv[index] ?? '';
    if (afterSeparator) {
      positional.push(token);
      continue;
    }
    if (token === '--') {
      afterSeparator = true;
      continue;
    }
    if (token.startsWith('--')) {
      const [rawKey = '', inline] = token.slice(2).split('=', 2);
      if (rawKey) {
        if (inline !== undefined) {
          options[rawKey] = inline;
        } else {
          const next = argv[index + 1];
          if (next !== undefined && !next.startsWith('-')) {
            options[rawKey] = next;
            index++;
          } else {
            options[rawKey] = true;
          }
        }
      }
      continue;
    }
    if (token.startsWith('-') && token.length > 1) {
      flags.push(token.slice(1));
      continue;
    }
    positional.push(token);
  }

  const [command, ...rest] = positional;
  return command === undefined
    ? {positional, options, flags}
    : {command, positional: rest, options, flags};
}

/**
 * @brief Repeats a character to reach a target width.
 *
 * @param char Character to repeat.
 * @param count Number of repetitions; values below zero yield an empty string.
 * @return The repeated string.
 */
export function repeatChar(char: string, count: number): string {
  return count > 0 ? char.repeat(count) : '';
}

/**
 * @brief Truncates text to a maximum length, appending a marker when cut.
 *
 * @param text Text to shorten.
 * @param maxLength Maximum allowed length, including the marker.
 * @param marker Suffix appended when truncation happens.
 * @return The original or truncated text.
 */
export function truncate(
  text: string,
  maxLength: number,
  marker = '...',
): string {
  if (text.length <= maxLength) {
    return text;
  }
  if (maxLength <= marker.length) {
    return text.slice(0, Math.max(0, maxLength));
  }
  return `${text.slice(0, maxLength - marker.length)}${marker}`;
}

/**
 * @brief Pads text on both sides to centre it within a width.
 *
 * @param text Text to centre.
 * @param width Target width.
 * @return Text padded with spaces; left padding is favoured on odd margins.
 */
export function center(text: string, width: number): string {
  const margin = Math.max(0, width - text.length);
  const left = Math.floor(margin / 2);
  const right = margin - left;
  return `${' '.repeat(left)}${text}${' '.repeat(right)}`;
}

/**
 * @brief Wraps text in double quotes.
 *
 * @param text Text to quote.
 * @return The quoted string.
 */
export function quote(text: string): string {
  return `"${text}"`;
}
