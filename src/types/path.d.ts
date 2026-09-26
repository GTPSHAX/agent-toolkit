/**
 * @fileoverview Types for the path tool.
 */

/** Operation performed by the path tool. */
export type PathAction =
  | 'join'
  | 'resolve'
  | 'normalize'
  | 'relative'
  | 'parse'
  | 'absolute'
  | 'basename'
  | 'dirname'
  | 'extname';

/** Path flavor used by the operation. */
export type PathPlatform = 'posix' | 'win32';

/** Result of a path operation. */
export interface PathResult {
  /** Operation that was performed. */
  readonly action: PathAction;
  /** Path flavor used for the operation. */
  readonly platform: PathPlatform;
  /** Joined, resolved, normalized, relative, or inspected path output. */
  readonly result: string | PathParts;
  /** Whether the inspected path is absolute. */
  readonly absolute?: boolean;
}

/** Components of a parsed path. */
export interface PathParts {
  /** Root portion such as `/` or `C:\`. */
  readonly root: string;
  /** Directory portion without the trailing separator. */
  readonly dir: string;
  /** File name with its extension. */
  readonly base: string;
  /** Extension including the leading dot. */
  readonly ext: string;
  /** File name without its extension. */
  readonly name: string;
}
