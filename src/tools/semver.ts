/**
 * @fileoverview The built-in `semver` tool.
 */

import type {JsonValue} from '../types/common.js';
import type {SemverAction} from '../types/semver.js';
import type {JsonSchema, ToolDefinition, ToolOutput} from '../types/tools.js';
import {
  bumpVersion,
  compareVersions,
  parseRange,
  parseVersion,
  satisfiesRange,
  type SemverRelease,
} from '../utils/semver.js';
import {failure, success} from './executor.js';

/** Tool name. */
export const SEMVER_TOOL_NAME = 'semver';

/** Output schema of the `semver` tool. */
const SEMVER_OUTPUT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    action: {type: 'string'},
    version: {type: 'object'},
    versions: {type: 'array'},
    comparison: {type: 'number'},
    satisfies: {type: 'boolean'},
    bumped: {type: 'string'},
    range: {type: 'array'},
    error: {type: 'string'},
  },
  required: ['action'],
};

/**
 * @brief Creates the `semver` tool.
 *
 * @return A tool definition that parses, compares, bumps, and checks versions.
 */
export function semverTool(): ToolDefinition {
  return {
    name: SEMVER_TOOL_NAME,
    title: 'Semantic version',
    description: 'Parses, compares, bumps, and range-checks semantic versions.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Operation to perform.',
          enum: ['parse', 'compare', 'satisfies', 'bump', 'range'],
        },
        version: {type: 'string', description: 'Version for parse/bump.'},
        versions: {
          type: 'array',
          description: 'Versions to compare; highest first or per pair.',
        },
        range: {type: 'string', description: 'Range expression for satisfies.'},
        release: {
          type: 'string',
          description: 'Release kind for bump.',
          enum: [
            'major',
            'minor',
            'patch',
            'premajor',
            'preminor',
            'prepatch',
            'prerelease',
          ],
        },
        identifier: {
          type: 'string',
          description: 'Pre-release identifier such as beta.',
        },
      },
      required: ['action'],
    },
    outputSchema: SEMVER_OUTPUT_SCHEMA,
    handler: handleSemver,
  };
}

/**
 * @brief Handles a `semver` invocation.
 *
 * @param args Arguments carrying the action and its inputs.
 * @return Version output, or an error output.
 */
function handleSemver(args: JsonValue): ToolOutput {
  const action = readString(args, 'action');
  if (!isSemverAction(action)) {
    return failure(
      'semver requires "action" to be parse, compare, satisfies, bump, or range',
    );
  }
  try {
    switch (action) {
      case 'parse': {
        const version = readString(args, 'version');
        if (version === undefined) {
          return failure('semver parse requires a "version" argument');
        }
        const parsed = parseVersion(version);
        return success(parsed.version, toJson({action, version: parsed}));
      }
      case 'compare': {
        const versions = readStringArray(args, 'versions');
        if (versions === undefined || versions.length < 2) {
          return failure('semver compare requires at least two "versions"');
        }
        const parsed = versions.map(parseVersion);
        const comparison = compareVersions(
          parsed[0] as ReturnType<typeof parseVersion>,
          parsed[1] as ReturnType<typeof parseVersion>,
        );
        const sorted = [...parsed].sort(compareVersions).reverse();
        return success(
          String(comparison),
          toJson({action, versions: sorted, comparison}),
        );
      }
      case 'satisfies': {
        const version = readString(args, 'version');
        const range = readString(args, 'range');
        if (version === undefined || range === undefined) {
          return failure('semver satisfies requires "version" and "range"');
        }
        const satisfies = satisfiesRange(parseVersion(version), range);
        return success(
          String(satisfies),
          toJson({
            action,
            version: parseVersion(version),
            satisfies,
          }),
        );
      }
      case 'bump': {
        const version = readString(args, 'version');
        const release = readString(args, 'release');
        if (version === undefined || !isRelease(release)) {
          return failure(
            'semver bump requires "version" and a valid "release"',
          );
        }
        const identifier = readString(args, 'identifier');
        const bumped = bumpVersion(parseVersion(version), release, identifier);
        return success(
          bumped.version,
          toJson({action, version: bumped, bumped: bumped.version}),
        );
      }
      case 'range': {
        const range = readString(args, 'range');
        if (range === undefined) {
          return failure('semver range requires a "range" argument');
        }
        const comparators = parseRange(range);
        const described = comparators.map(group =>
          group
            .map(comparator => `${comparator.op}${comparator.version.version}`)
            .join(' '),
        );
        return success(
          described.join(' || '),
          toJson({action, range: described}),
        );
      }
    }
  } catch (cause) {
    return failure(
      `semver: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

/**
 * @brief Checks whether a value is a supported semver action.
 *
 * @param value Candidate action.
 * @return True when the action is recognized.
 */
function isSemverAction(value: string | undefined): value is SemverAction {
  return (
    value === 'parse' ||
    value === 'compare' ||
    value === 'satisfies' ||
    value === 'bump' ||
    value === 'range'
  );
}

/**
 * @brief Checks whether a value is a supported release kind.
 *
 * @param value Candidate release kind.
 * @return True when the release kind is recognized.
 */
function isRelease(value: string | undefined): value is SemverRelease {
  return (
    value === 'major' ||
    value === 'minor' ||
    value === 'patch' ||
    value === 'premajor' ||
    value === 'preminor' ||
    value === 'prepatch' ||
    value === 'prerelease'
  );
}

/**
 * @brief Reads a string field from tool arguments.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name.
 * @return The string when present, otherwise `undefined`.
 */
function readString(args: JsonValue, key: string): string | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return undefined;
  }
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * @brief Reads a string-array field from tool arguments.
 *
 * @param args Argument value of unknown shape.
 * @param key Field name.
 * @return The string array when valid, otherwise `undefined`.
 */
function readStringArray(args: JsonValue, key: string): string[] | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return undefined;
  }
  const value = args[key];
  return Array.isArray(value) &&
    value.every((item): item is string => typeof item === 'string')
    ? value
    : undefined;
}

/**
 * @brief Converts a value into JSON-safe tool payload data.
 *
 * @param value Value to convert.
 * @return JSON-compatible value.
 */
function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
