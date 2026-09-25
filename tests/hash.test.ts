/**
 * @fileoverview Unit tests for the hashing helpers and tool.
 */

import {describe, expect, it} from 'vitest';

import {createRegistry, executeTool} from '../src/tools/index.js';
import {hashTool} from '../src/tools/hash.js';
import {
  cryptoHash,
  hashText,
  isHashAlgorithm,
  protonHash,
  protonHash64,
} from '../src/utils/hash.js';

describe('cryptoHash', () => {
  it('computes known digests', () => {
    expect(cryptoHash('abc', 'md5')).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(cryptoHash('abc', 'sha1')).toBe(
      'a9993e364706816aba3e25717850c26c9cd0d89d',
    );
    expect(cryptoHash('abc', 'sha256')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(cryptoHash('abc', 'sha512')).toHaveLength(128);
  });
});

describe('protonHash', () => {
  it('returns the seed for empty input', () => {
    expect(protonHash('')).toBe(0x55555555);
  });

  it('matches the reference values', () => {
    expect(protonHash('a')).toBe(0xaaaaab0b);
    expect(protonHash('hello')).toBe(0xb15ee899);
    expect(protonHash('items.dat')).toBe(0xcbf3b3f8);
  });

  it('stays within unsigned 32-bit range', () => {
    const value = protonHash('the quick brown fox');
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('protonHash64', () => {
  it('matches the wide reference values', () => {
    expect(protonHash64('')).toBe('1431655765');
    expect(protonHash64('a')).toBe('45812984587');
    expect(protonHash64('hello')).toBe('48038396181789497');
  });
});

describe('isHashAlgorithm', () => {
  it('accepts known algorithms and rejects others', () => {
    expect(isHashAlgorithm('sha256')).toBe(true);
    expect(isHashAlgorithm('protonhash')).toBe(true);
    expect(isHashAlgorithm('protonhash64')).toBe(true);
    expect(isHashAlgorithm('md4')).toBe(false);
    expect(isHashAlgorithm(42)).toBe(false);
  });
});

describe('hashText', () => {
  it('formats protonhash as eight lowercase hex digits', () => {
    expect(hashText('', 'protonhash')).toBe('55555555');
    expect(hashText('hello', 'protonhash')).toBe('b15ee899');
  });

  it('formats protonhash64 as a decimal string', () => {
    expect(hashText('a', 'protonhash64')).toBe('45812984587');
  });
});

describe('hash tool', () => {
  it('hashes with the default algorithm', async () => {
    const registry = createRegistry([hashTool()]);
    const output = await executeTool(registry, 'hash', {text: 'abc'});
    expect(output.isError).toBe(false);
    expect(output.structuredContent).toMatchObject({
      algorithm: 'sha256',
      digest:
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    });
  });

  it('supports protonhash', async () => {
    const registry = createRegistry([hashTool()]);
    const output = await executeTool(registry, 'hash', {
      text: 'hello',
      algorithm: 'protonhash',
    });
    expect(output.structuredContent).toMatchObject({digest: 'b15ee899'});
  });

  it('fails on an unknown algorithm', async () => {
    const registry = createRegistry([hashTool()]);
    const output = await executeTool(registry, 'hash', {
      text: 'abc',
      algorithm: 'md4',
    });
    expect(output.isError).toBe(true);
  });

  it('fails when text is missing', async () => {
    const registry = createRegistry([hashTool()]);
    const output = await executeTool(registry, 'hash', {});
    expect(output.isError).toBe(true);
  });
});
