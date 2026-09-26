/**
 * @fileoverview Regular-expression operations shared by the regex tool.
 */

import type {RegexMatch, RegexMode, RegexResult} from '../types/regex.js';

/** Flags accepted by {@link applyRegex}. */
export const SUPPORTED_FLAGS = 'dgimsuvy';

/** Default maximum characters kept in a replacement result. */
export const DEFAULT_REGEX_MAX_LENGTH = 20000;

/** Options accepted by {@link applyRegex}. */
export interface RegexOptions {
  /** Source pattern without delimiters. */
  readonly pattern: string;
  /** Input string to operate on. */
  readonly input: string;
  /** Operation to perform; defaults to `match`. */
  readonly mode?: RegexMode;
  /** Pattern flags; `g` is added automatically for matching and splitting. */
  readonly flags?: string;
  /** Replacement text for `replace` mode, including `$1` and `$<name>`. */
  readonly replacement?: string;
  /** Maximum matches to keep; zero or absent keeps all. */
  readonly limit?: number;
}

/**
 * @brief Applies a regular expression to an input string.
 *
 * Invalid patterns and flags are reported in `error` rather than thrown.
 *
 * @param options Pattern, input, mode, flags, and replacement.
 * @return Matches, a replacement, or split parts, with a match count.
 */
export function applyRegex(options: RegexOptions): RegexResult {
  const mode = options.mode ?? 'match';
  const requested = normalizeFlags(options.flags ?? '');
  try {
    const invalid = validateFlags(requested);
    if (invalid !== undefined) {
      throw new Error(invalid);
    }
    const flags = withGlobal(requested);
    const regex = new RegExp(options.pattern, flags);
    if (mode === 'replace') {
      const replaced = options.input.replace(regex, options.replacement ?? '');
      const count = countMatches(options.input, options.pattern, flags);
      return {
        pattern: options.pattern,
        flags,
        mode,
        count,
        replaced: replaced.slice(0, DEFAULT_REGEX_MAX_LENGTH),
        matched: count > 0,
      };
    }
    if (mode === 'split') {
      const parts = options.input.split(regex);
      return {
        pattern: options.pattern,
        flags,
        mode,
        count: parts.length,
        parts,
        matched: parts.length > 1,
      };
    }
    const matches = collectMatches(regex, options.input, options.limit ?? 0);
    return {
      pattern: options.pattern,
      flags,
      mode,
      count: matches.length,
      matches,
      matched: matches.length > 0,
    };
  } catch (cause) {
    return {
      pattern: options.pattern,
      flags: requested,
      mode,
      count: 0,
      matched: false,
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

/**
 * @brief Collects matches from a global regular expression.
 *
 * @param regex Compiled global regular expression.
 * @param input Input string.
 * @param limit Maximum matches to keep; zero keeps all.
 * @return Matches in input order.
 */
function collectMatches(
  regex: RegExp,
  input: string,
  limit: number,
): RegexMatch[] {
  const matches: RegexMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    matches.push({
      match: match[0],
      index: match.index,
      groups: [...match.slice(1)],
      ...(match.groups === undefined
        ? {}
        : {named: {...match.groups} as Record<string, string | null>}),
    });
    if (limit > 0 && matches.length >= limit) {
      break;
    }
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }
  return matches;
}

/**
 * @brief Counts matches without building result objects.
 *
 * @param input Input string.
 * @param pattern Source pattern.
 * @param flags Flags; `g` is added when missing.
 * @return Number of matches.
 */
function countMatches(input: string, pattern: string, flags: string): number {
  return collectMatches(new RegExp(pattern, withGlobal(flags)), input, 0)
    .length;
}

/**
 * @brief Adds the global flag when it is missing.
 *
 * Every mode operates on all occurrences by default, so `g` is always present.
 *
 * @param flags Effective flags.
 * @return Flags including `g`.
 */
function withGlobal(flags: string): string {
  return flags.includes('g') ? flags : `${flags}g`;
}

/**
 * @brief Removes duplicate flag characters.
 *
 * @param flags Raw flags.
 * @return Flags with each character appearing once, in input order.
 */
function normalizeFlags(flags: string): string {
  return [...new Set(flags)].join('');
}

/**
 * @brief Validates flag characters.
 *
 * @param flags Normalized flags.
 * @return An error message, or `undefined` when the flags are valid.
 */
function validateFlags(flags: string): string | undefined {
  for (const char of flags) {
    if (!SUPPORTED_FLAGS.includes(char)) {
      return `unsupported flag "${char}"`;
    }
  }
  return undefined;
}
