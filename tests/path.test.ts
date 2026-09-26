/**
 * @fileoverview Unit tests for cross-platform path operations.
 */

import {describe, expect, it} from 'vitest';

import {pathTool} from '../src/tools/path.js';
import {createRegistry, executeTool} from '../src/tools/index.js';
import {parsePathParts} from '../src/utils/path.js';

describe('parsePathParts', () => {
  it('parses POSIX components', () => {
    expect(parsePathParts('/a/b/c.txt', 'posix')).toEqual({
      root: '/',
      dir: '/a/b',
      base: 'c.txt',
      ext: '.txt',
      name: 'c',
    });
  });

  it('parses Windows components', () => {
    expect(parsePathParts('C:\\a\\b\\c.txt', 'win32')).toEqual({
      root: 'C:\\',
      dir: 'C:\\a\\b',
      base: 'c.txt',
      ext: '.txt',
      name: 'c',
    });
  });
});

describe('path tool', () => {
  it('joins, normalizes, and computes relatives in both flavors', async () => {
    const registry = createRegistry([pathTool()]);
    const join = await executeTool(registry, 'path', {
      action: 'join',
      paths: ['/a', 'b', 'c'],
      platform: 'posix',
    });
    expect(join.structuredContent).toMatchObject({result: '/a/b/c'});

    const win = await executeTool(registry, 'path', {
      action: 'join',
      paths: ['C:\\a', 'b'],
      platform: 'win32',
    });
    expect(win.structuredContent).toMatchObject({result: 'C:\\a\\b'});

    const relative = await executeTool(registry, 'path', {
      action: 'relative',
      from: '/a/b',
      to: '/a/b/c/d',
      platform: 'posix',
    });
    expect(relative.structuredContent).toMatchObject({result: 'c/d'});
  });

  it('inspects absolute status, names, and extensions', async () => {
    const registry = createRegistry([pathTool()]);
    const absolute = await executeTool(registry, 'path', {
      action: 'absolute',
      path: '/a/b',
      platform: 'posix',
    });
    expect(absolute.structuredContent).toMatchObject({absolute: true});

    const basename = await executeTool(registry, 'path', {
      action: 'basename',
      path: '/a/b/c.txt',
      platform: 'posix',
    });
    expect(basename.structuredContent).toMatchObject({result: 'c.txt'});

    const stripped = await executeTool(registry, 'path', {
      action: 'basename',
      path: '/a/b/c.txt',
      ext: '.txt',
      platform: 'posix',
    });
    expect(stripped.structuredContent).toMatchObject({result: 'c'});

    const ext = await executeTool(registry, 'path', {
      action: 'extname',
      path: '/a/b/c.txt',
      platform: 'posix',
    });
    expect(ext.structuredContent).toMatchObject({result: '.txt'});
  });

  it('rejects unknown actions and missing inputs', async () => {
    const registry = createRegistry([pathTool()]);
    expect((await executeTool(registry, 'path', {action: 'x'})).isError).toBe(
      true,
    );
    expect(
      (await executeTool(registry, 'path', {action: 'join'})).isError,
    ).toBe(true);
  });
});
