/**
 * @fileoverview Types for the regular-expression tool.
 */

/** Operation performed by the regex tool. */
export type RegexMode = 'match' | 'replace' | 'split';

/** One regex match with its captures. */
export interface RegexMatch {
  /** Full matched text. */
  readonly match: string;
  /** Zero-based offset of the match in the input. */
  readonly index: number;
  /** Numbered capture groups; `null` for unmatched optional groups. */
  readonly groups: readonly (string | null)[];
  /** Named capture groups keyed by name. */
  readonly named?: Readonly<Record<string, string | null>>;
}

/** Result of a regex operation. */
export interface RegexResult {
  /** Source pattern. */
  readonly pattern: string;
  /** Effective flags, including any added `g` for matching. */
  readonly flags: string;
  /** Operation that was performed. */
  readonly mode: RegexMode;
  /** Number of matches, replacements, or split parts. */
  readonly count: number;
  /** Matches in input order; populated in `match` mode. */
  readonly matches?: readonly RegexMatch[];
  /** Replacement result; populated in `replace` mode. */
  readonly replaced?: string;
  /** Split parts; populated in `split` mode. */
  readonly parts?: readonly string[];
  /** Whether the pattern matched anywhere. */
  readonly matched: boolean;
  /** Pattern error message when the expression is invalid. */
  readonly error?: string;
}
