/**
 * @fileoverview Cross-platform path operations for the `path` tool.
 */

import {posix, win32} from 'node:path';

import type {PathParts, PathPlatform} from '../types/path.js';

/** Platform used when none is requested. */
export const DEFAULT_PATH_PLATFORM: PathPlatform =
  process.platform === 'win32' ? 'win32' : 'posix';

/** Path interface selected by flavor. */
interface PathApi {
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  normalize(path: string): string;
  relative(from: string, to: string): string;
  parse(path: string): {
    root: string;
    dir: string;
    base: string;
    ext: string;
    name: string;
  };
  isAbsolute(path: string): boolean;
  basename(path: string, ext?: string): string;
  dirname(path: string): string;
  extname(path: string): string;
  sep: string;
}

/**
 * @brief Selects the path implementation for a flavor.
 *
 * @param platform Requested flavor, or the host default.
 * @return The matching `node:path` implementation.
 */
export function pathApi(
  platform: PathPlatform = DEFAULT_PATH_PLATFORM,
): PathApi {
  return platform === 'win32' ? win32 : posix;
}

/**
 * @brief Parses a path into its components.
 *
 * @param path Path to parse.
 * @param platform Path flavor.
 * @return Root, directory, base, extension, and stem.
 */
export function parsePathParts(
  path: string,
  platform: PathPlatform = DEFAULT_PATH_PLATFORM,
): PathParts {
  const parsed = pathApi(platform).parse(path);
  return {
    root: parsed.root,
    dir: parsed.dir,
    base: parsed.base,
    ext: parsed.ext,
    name: parsed.name,
  };
}
