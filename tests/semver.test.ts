/**
 * @fileoverview Unit tests for semantic-version helpers and the semver tool.
 */

import {describe, expect, it} from 'vitest';

import {semverTool} from '../src/tools/semver.js';
import {createRegistry, executeTool} from '../src/tools/index.js';
import {
  bumpVersion,
  compareVersions,
  parseVersion,
  satisfiesRange,
} from '../src/utils/semver.js';

describe('parseVersion', () => {
  it('parses major, minor, patch, prerelease, and build', () => {
    const version = parseVersion('v1.2.3-beta.1+build.5');
    expect(version).toMatchObject({major: 1, minor: 2, patch: 3});
    expect(version.prerelease).toEqual(['beta', 1]);
    expect(version.build).toEqual(['build', '5']);
    expect(version.version).toBe('1.2.3-beta.1+build.5');
  });

  it('rejects malformed versions', () => {
    expect(() => parseVersion('1.2')).toThrow();
    expect(() => parseVersion('nope')).toThrow();
  });
});

describe('compareVersions', () => {
  it('orders by numeric components', () => {
    expect(compareVersions(parseVersion('1.2.3'), parseVersion('1.2.4'))).toBe(
      -1,
    );
    expect(compareVersions(parseVersion('2.0.0'), parseVersion('1.9.9'))).toBe(
      1,
    );
    expect(compareVersions(parseVersion('1.0.0'), parseVersion('1.0.0'))).toBe(
      0,
    );
  });

  it('ranks pre-releases below the release and compares identifiers', () => {
    expect(
      compareVersions(parseVersion('1.0.0-beta'), parseVersion('1.0.0')),
    ).toBe(-1);
    expect(
      compareVersions(
        parseVersion('1.0.0-beta.2'),
        parseVersion('1.0.0-beta.11'),
      ),
    ).toBe(-1);
    expect(
      compareVersions(parseVersion('1.0.0-alpha'), parseVersion('1.0.0-beta')),
    ).toBe(-1);
  });
});

describe('satisfiesRange', () => {
  it('handles caret, tilde, comparators, and wildcards', () => {
    expect(satisfiesRange(parseVersion('1.5.0'), '^1.2.0')).toBe(true);
    expect(satisfiesRange(parseVersion('2.0.0'), '^1.2.0')).toBe(false);
    expect(satisfiesRange(parseVersion('1.2.9'), '~1.2.0')).toBe(true);
    expect(satisfiesRange(parseVersion('1.3.0'), '~1.2.0')).toBe(false);
    expect(satisfiesRange(parseVersion('1.2.3'), '>=1.0.0 <2.0.0')).toBe(true);
    expect(satisfiesRange(parseVersion('1.9.0'), '1.x')).toBe(true);
    expect(satisfiesRange(parseVersion('2.0.0'), '1.x')).toBe(false);
  });

  it('handles unions and hyphen ranges', () => {
    expect(satisfiesRange(parseVersion('1.5.0'), '^1 || ^2')).toBe(true);
    expect(satisfiesRange(parseVersion('2.5.0'), '^1 || ^2')).toBe(true);
    expect(satisfiesRange(parseVersion('3.0.0'), '^1 || ^2')).toBe(false);
    expect(satisfiesRange(parseVersion('1.2.3'), '1.0.0 - 1.5.0')).toBe(true);
    expect(satisfiesRange(parseVersion('1.6.0'), '1.0.0 - 1.5.0')).toBe(false);
  });
});

describe('bumpVersion', () => {
  it('bumps release components', () => {
    const base = parseVersion('1.2.3');
    expect(bumpVersion(base, 'major').version).toBe('2.0.0');
    expect(bumpVersion(base, 'minor').version).toBe('1.3.0');
    expect(bumpVersion(base, 'patch').version).toBe('1.2.4');
  });

  it('creates pre-releases with an identifier', () => {
    const base = parseVersion('1.2.3');
    expect(bumpVersion(base, 'preminor', 'beta').version).toBe('1.3.0-beta.0');
    expect(
      bumpVersion(parseVersion('1.3.0-beta.1'), 'prerelease').version,
    ).toBe('1.3.0-beta.2');
  });
});

describe('semver tool', () => {
  it('parses, compares, satisfies, bumps, and expands ranges', async () => {
    const registry = createRegistry([semverTool()]);
    const parse = await executeTool(registry, 'semver', {
      action: 'parse',
      version: '1.2.3',
    });
    expect(parse.isError).toBe(false);

    const compare = await executeTool(registry, 'semver', {
      action: 'compare',
      versions: ['1.2.3', '1.2.4'],
    });
    expect(compare.structuredContent).toMatchObject({comparison: -1});

    const satisfies = await executeTool(registry, 'semver', {
      action: 'satisfies',
      version: '1.5.0',
      range: '^1.2.0',
    });
    expect(satisfies.structuredContent).toMatchObject({satisfies: true});

    const bump = await executeTool(registry, 'semver', {
      action: 'bump',
      version: '1.2.3',
      release: 'minor',
    });
    expect(bump.structuredContent).toMatchObject({bumped: '1.3.0'});

    const range = await executeTool(registry, 'semver', {
      action: 'range',
      range: '^1.2.0',
    });
    expect(range.isError).toBe(false);
  });

  it('rejects unknown actions and malformed input', async () => {
    const registry = createRegistry([semverTool()]);
    expect((await executeTool(registry, 'semver', {action: 'x'})).isError).toBe(
      true,
    );
    expect(
      (
        await executeTool(registry, 'semver', {
          action: 'bump',
          version: '1.0.0',
          release: 'nope',
        })
      ).isError,
    ).toBe(true);
  });
});
