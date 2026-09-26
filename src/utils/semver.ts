/**
 * @fileoverview Semantic-version parsing, comparison, and npm-style ranges.
 */

import type {SemVer} from '../types/semver.js';

/** A single range comparator. */
interface Comparator {
  readonly op: '=' | '<' | '<=' | '>' | '>=';
  readonly version: SemVer;
}

/** Release kinds accepted by {@link bumpVersion}. */
export type SemverRelease =
  | 'major'
  | 'minor'
  | 'patch'
  | 'premajor'
  | 'preminor'
  | 'prepatch'
  | 'prerelease';

/**
 * @brief Parses a semantic-version string.
 *
 * Accepts an optional leading `v`, pre-release, and build metadata.
 *
 * @param input Version text such as `1.2.3-beta.1+build`.
 * @return The parsed version.
 * @throws Error When the text is not a valid semantic version.
 */
export function parseVersion(input: string): SemVer {
  const text = input.trim().replace(/^[=v]+/, '');
  const match =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/.exec(
      text,
    );
  if (match === null) {
    throw new Error(`invalid semantic version "${input}"`);
  }
  const prerelease = (match[4] ?? '')
    .split('.')
    .filter(Boolean)
    .map(part => (/^\d+$/.test(part) ? Number(part) : part));
  const build = (match[5] ?? '').split('.').filter(Boolean);
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  return {
    major,
    minor,
    patch,
    prerelease,
    build,
    version: formatVersion({major, minor, patch, prerelease, build}),
  };
}

/**
 * @brief Renders version components as a normalized string.
 *
 * @param version Partial version components.
 * @return `major.minor.patch[-pre][+build]`.
 */
function formatVersion(version: {
  major: number;
  minor: number;
  patch: number;
  prerelease: readonly (string | number)[];
  build: readonly string[];
}): string {
  const core = `${version.major}.${version.minor}.${version.patch}`;
  const pre =
    version.prerelease.length > 0 ? `-${version.prerelease.join('.')}` : '';
  const build = version.build.length > 0 ? `+${version.build.join('.')}` : '';
  return `${core}${pre}${build}`;
}

/**
 * @brief Compares two semantic versions by precedence.
 *
 * @param a Left version.
 * @param b Right version.
 * @return `-1` when `a < b`, `0` when equal, `1` when `a > b`.
 */
export function compareVersions(a: SemVer, b: SemVer): number {
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (a[key] !== b[key]) {
      return a[key] < b[key] ? -1 : 1;
    }
  }
  return comparePrerelease(a.prerelease, b.prerelease);
}

/**
 * @brief Compares two pre-release identifier lists.
 *
 * @param a Left identifiers.
 * @param b Right identifiers.
 * @return `-1`, `0`, or `1`.
 */
function comparePrerelease(
  a: readonly (string | number)[],
  b: readonly (string | number)[],
): number {
  if (a.length === 0 && b.length === 0) {
    return 0;
  }
  if (a.length === 0) {
    return 1;
  }
  if (b.length === 0) {
    return -1;
  }
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index++) {
    const left = a[index];
    const right = b[index];
    if (left === undefined) {
      return -1;
    }
    if (right === undefined) {
      return 1;
    }
    if (left === right) {
      continue;
    }
    const leftNumeric = typeof left === 'number';
    const rightNumeric = typeof right === 'number';
    if (leftNumeric && rightNumeric) {
      return left < right ? -1 : 1;
    }
    if (leftNumeric !== rightNumeric) {
      return leftNumeric ? -1 : 1;
    }
    return String(left) < String(right) ? -1 : 1;
  }
  return 0;
}

/**
 * @brief Tests whether a version satisfies an npm-style range.
 *
 * Supports `||` unions, space-separated intersections, `*` and `x` wildcards,
 * `^`, `~`, hyphen ranges, and the comparators `=`, `<`, `<=`, `>`, `>=`.
 *
 * @param version Version to test.
 * @param range Range expression.
 * @return True when the version is within the range.
 */
export function satisfiesRange(version: SemVer, range: string): boolean {
  return parseRange(range).some(comparators =>
    comparators.every(comparator => testComparator(version, comparator)),
  );
}

/**
 * @brief Expands a range into a list of comparator intersections.
 *
 * @param range Range expression.
 * @return One comparator list per `||` alternative.
 */
export function parseRange(range: string): Comparator[][] {
  return range
    .split('||')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(part => parseRangePart(part));
}

/**
 * @brief Parses one `||` alternative into comparators.
 *
 * @param part Range fragment without `||`.
 * @return Comparators that must all hold.
 */
function parseRangePart(part: string): Comparator[] {
  if (part === '' || part === '*' || part === 'x') {
    return [];
  }
  const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(part);
  if (hyphen !== null) {
    const lower = parsePartial(hyphen[1] ?? '');
    const upper = parsePartial(hyphen[2] ?? '');
    return [
      {op: '>=', version: lower.floor},
      {op: '<=', version: upper.ceiling},
    ];
  }
  const comparators: Comparator[] = [];
  for (const token of part.split(/\s+/).filter(Boolean)) {
    comparators.push(...parseToken(token));
  }
  return comparators;
}

/**
 * @brief Parses a single range token into comparators.
 *
 * @param token Range token such as `^1.2.3` or `1.x`.
 * @return Comparators produced by the token.
 */
function parseToken(token: string): Comparator[] {
  if (token === '*' || token === 'x' || token === 'X') {
    return [];
  }
  const caret = token.startsWith('^');
  const tilde = token.startsWith('~');
  if (caret || tilde) {
    const partial = parsePartial(token.slice(1));
    return caret
      ? [
          {op: '>=', version: partial.floor},
          {op: '<', version: caretCeiling(partial.raw)},
        ]
      : [
          {op: '>=', version: partial.floor},
          {op: '<', version: tildeCeiling(partial.raw)},
        ];
  }
  const opMatch = /^(>=|<=|>|<|=)?\s*(.*)$/.exec(token);
  const op = (opMatch?.[1] ?? '=') as Comparator['op'];
  const partial = parsePartial(opMatch?.[2] ?? '');
  if (partial.wildcard) {
    return [
      {op: '>=', version: partial.floor},
      {op: '<', version: partial.ceiling},
    ];
  }
  return [{op, version: partial.floor}];
}

/**
 * @brief Parses a full or partial version into a comparison interval.
 *
 * @param input Version text, possibly with `x`/`*` components.
 * @return Inclusive floor and exclusive ceiling.
 * @throws Error When the text cannot be parsed.
 */
function parsePartial(input: string): {
  raw: string;
  floor: SemVer;
  ceiling: SemVer;
  wildcard: boolean;
} {
  const text = input.trim().replace(/^[=v]+/, '');
  const parts = text.split('-');
  const core = (parts[0] ?? '').split('.');
  const wildcard = core.some(part => part === '' || /^[xX*]$/.test(part));
  const nums = core.map(part => (/^\d+$/.test(part) ? Number(part) : 0));
  const major = nums[0] ?? 0;
  const minor = nums[1] ?? 0;
  const patch = nums[2] ?? 0;
  const floor = makeVersion(major, minor, patch);
  const ceiling = wildcard
    ? nextWildcard(core)
    : makeVersion(major, minor, patch + 1);
  return {raw: text, floor, ceiling, wildcard};
}

/**
 * @brief Computes the exclusive ceiling for a wildcard version.
 *
 * @param core Dot-separated version components.
 * @return The smallest version above every match.
 */
function nextWildcard(core: readonly string[]): SemVer {
  const known = core.filter(part => /^\d+$/.test(part)).map(Number);
  if (known.length === 0) {
    return makeVersion(0, 0, 1);
  }
  if (known.length === 1) {
    return makeVersion((known[0] ?? 0) + 1, 0, 0);
  }
  return makeVersion(known[0] ?? 0, (known[1] ?? 0) + 1, 0);
}

/**
 * @brief Builds a plain version object.
 *
 * @param major Major number.
 * @param minor Minor number.
 * @param patch Patch number.
 * @return A version with no pre-release or build metadata.
 */
function makeVersion(major: number, minor: number, patch: number): SemVer {
  return {
    major,
    minor,
    patch,
    prerelease: [],
    build: [],
    version: `${major}.${minor}.${patch}`,
  };
}

/**
 * @brief Computes the upper bound for a caret range.
 *
 * @param raw Version text after the caret.
 * @return The exclusive upper version.
 */
function caretCeiling(raw: string): SemVer {
  const known =
    raw
      .split('-')[0]
      ?.split('.')
      .filter(part => /^\d+$/.test(part))
      .map(Number) ?? [];
  const major = known[0] ?? 0;
  const minor = known[1] ?? 0;
  const patch = known[2] ?? 0;
  if (major > 0) {
    return makeVersion(major + 1, 0, 0);
  }
  if (minor > 0) {
    return makeVersion(0, minor + 1, 0);
  }
  return makeVersion(0, 0, patch + 1);
}

/**
 * @brief Computes the upper bound for a tilde range.
 *
 * @param raw Version text after the tilde.
 * @return The exclusive upper version.
 */
function tildeCeiling(raw: string): SemVer {
  const known =
    raw
      .split('-')[0]
      ?.split('.')
      .filter(part => /^\d+$/.test(part))
      .map(Number) ?? [];
  if (known.length >= 2) {
    return makeVersion(known[0] ?? 0, (known[1] ?? 0) + 1, 0);
  }
  return makeVersion((known[0] ?? 0) + 1, 0, 0);
}

/**
 * @brief Evaluates one comparator against a version.
 *
 * @param version Version to test.
 * @param comparator Comparator to apply.
 * @return True when the comparator holds.
 */
function testComparator(version: SemVer, comparator: Comparator): boolean {
  const order = compareVersions(version, comparator.version);
  switch (comparator.op) {
    case '=':
      return order === 0;
    case '<':
      return order < 0;
    case '<=':
      return order <= 0;
    case '>':
      return order > 0;
    case '>=':
      return order >= 0;
  }
}

/**
 * @brief Bumps a version to a new release.
 *
 * @param version Base version.
 * @param release Release kind to produce.
 * @param identifier Optional pre-release identifier, e.g. `beta`.
 * @return The bumped version.
 */
export function bumpVersion(
  version: SemVer,
  release: SemverRelease,
  identifier?: string,
): SemVer {
  const pre = identifier === undefined ? [] : [identifier];
  switch (release) {
    case 'major':
      return makeVersion(version.major + 1, 0, 0);
    case 'minor':
      return makeVersion(version.major, version.minor + 1, 0);
    case 'patch':
      return makeVersion(version.major, version.minor, version.patch + 1);
    case 'premajor':
      return withPre(makeVersion(version.major + 1, 0, 0), pre, 0);
    case 'preminor':
      return withPre(makeVersion(version.major, version.minor + 1, 0), pre, 0);
    case 'prepatch':
      return withPre(
        makeVersion(version.major, version.minor, version.patch + 1),
        pre,
        0,
      );
    case 'prerelease': {
      const prerelease = version.prerelease;
      if (prerelease.length === 0) {
        return withPre(
          makeVersion(version.major, version.minor, version.patch + 1),
          pre,
          0,
        );
      }
      const last = prerelease[prerelease.length - 1];
      const head = identifier ?? (typeof last === 'string' ? last : undefined);
      const next = prerelease
        .slice(0, -1)
        .filter(part => typeof part !== 'number' || part !== 0);
      const numeric = typeof last === 'number' ? last + 1 : 0;
      return withPre(
        makeVersion(version.major, version.minor, version.patch),
        head === undefined ? next : [...next, head],
        typeof last === 'number' ? numeric : 0,
      );
    }
  }
}

/**
 * @brief Attaches pre-release identifiers to a base version.
 *
 * @param base Base version without pre-release.
 * @param pre Pre-release identifiers.
 * @param counter Optional numeric counter appended to the identifiers.
 * @return A version with the pre-release applied.
 */
function withPre(
  base: SemVer,
  pre: readonly (string | number)[],
  counter: number,
): SemVer {
  const prerelease = [...pre, counter];
  return {
    major: base.major,
    minor: base.minor,
    patch: base.patch,
    prerelease,
    build: [],
    version: formatVersion({...base, prerelease, build: []}),
  };
}
