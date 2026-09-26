/**
 * @fileoverview Types for the semantic-version tool.
 */

/** Operation performed by the semver tool. */
export type SemverAction = 'parse' | 'compare' | 'satisfies' | 'bump' | 'range';

/** A parsed semantic version. */
export interface SemVer {
  /** Major version number. */
  readonly major: number;
  /** Minor version number. */
  readonly minor: number;
  /** Patch version number. */
  readonly patch: number;
  /** Dot-separated pre-release identifiers. */
  readonly prerelease: readonly (string | number)[];
  /** Dot-separated build metadata identifiers. */
  readonly build: readonly string[];
  /** Normalized `major.minor.patch[-pre][+build]` string. */
  readonly version: string;
}

/** Result of a semantic-version operation. */
export interface SemverResult {
  /** Operation that was performed. */
  readonly action: SemverAction;
  /** Parsed version, present for single-version actions. */
  readonly version?: SemVer;
  /** Parsed versions in input order. */
  readonly versions?: readonly SemVer[];
  /** Comparison result: `-1`, `0`, or `1`. */
  readonly comparison?: number;
  /** Whether a version satisfies a range. */
  readonly satisfies?: boolean;
  /** Bumped version string. */
  readonly bumped?: string;
  /** Range description, present for `range`. */
  readonly range?: readonly string[];
  /** Error message when an input could not be parsed. */
  readonly error?: string;
}
