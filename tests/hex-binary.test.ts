/**
 * @fileoverview Unit tests for the hex and binary helpers and tools.
 */

import {describe, expect, it} from 'vitest';

import {createRegistry, executeTool} from '../src/tools/index.js';
import {binaryTool, hexTool} from '../src/tools/hex-binary.js';
import {
  binaryDecode,
  binaryEncode,
  hexDecode,
  hexEncode,
} from '../src/utils/hex-binary.js';

describe('hex', () => {
  it('round-trips text', () => {
    expect(hexDecode(hexEncode('hello'))).toBe('hello');
    expect(hexDecode(hexEncode('a👍b'))).toBe('a👍b');
  });

  it('encodes to known values', () => {
    expect(hexEncode('hello')).toBe('68656c6c6f');
    expect(hexEncode('hello', true)).toBe('68656C6C6F');
  });

  it('tolerates whitespace and odd casing on decode', () => {
    expect(hexDecode('68 65 6C 6C 6F')).toBe('hello');
  });

  it('rejects invalid input', () => {
    expect(() => hexDecode('zz')).toThrow();
    expect(() => hexDecode('abc')).toThrow();
  });
});

describe('binary', () => {
  it('round-trips text', () => {
    expect(binaryDecode(binaryEncode('hi'))).toBe('hi');
  });

  it('encodes to known values', () => {
    expect(binaryEncode('hi')).toBe('01101000 01101001');
  });

  it('tolerates whitespace on decode', () => {
    expect(binaryDecode('0110100001101001')).toBe('hi');
  });

  it('rejects invalid input', () => {
    expect(() => binaryDecode('0101')).toThrow();
    expect(() => binaryDecode('0210')).toThrow();
  });
});

describe('hex and binary tools', () => {
  it('hex encodes', async () => {
    const registry = createRegistry([hexTool()]);
    const output = await executeTool(registry, 'hex', {
      text: 'hi',
      mode: 'encode',
    });
    expect(output.structuredContent).toMatchObject({text: '6869'});
  });

  it('binary decodes', async () => {
    const registry = createRegistry([binaryTool()]);
    const output = await executeTool(registry, 'binary', {
      text: '01101000 01101001',
      mode: 'decode',
    });
    expect(output.structuredContent).toMatchObject({text: 'hi'});
  });

  it('fails on invalid input', async () => {
    const registry = createRegistry([hexTool(), binaryTool()]);
    expect(
      (await executeTool(registry, 'hex', {text: 'zz', mode: 'decode'}))
        .isError,
    ).toBe(true);
    expect(
      (
        await executeTool(registry, 'binary', {
          text: '123',
          mode: 'decode',
        })
      ).isError,
    ).toBe(true);
  });
});
