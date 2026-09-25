/**
 * @fileoverview Unit tests for the base64 helper and tool.
 */

import {describe, expect, it} from 'vitest';

import {createRegistry, executeTool} from '../src/tools/index.js';
import {base64Tool} from '../src/tools/base64.js';
import {base64Decode, base64Encode} from '../src/utils/base64.js';

describe('base64', () => {
  it('round-trips ASCII and non-ASCII text', () => {
    for (const text of ['hello', 'a👍b', '']) {
      expect(base64Decode(base64Encode(text))).toBe(text);
    }
  });

  it('encodes to known values', () => {
    expect(base64Encode('hello')).toBe('aGVsbG8=');
    expect(base64Encode('a👍b')).toBe('YfCfkY1i');
  });

  it('produces URL-safe output without padding', () => {
    const encoded = base64Encode('\u00ff\u00ff?', true);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('decodes URL-safe input', () => {
    const encoded = base64Encode('subjects?_d', true);
    expect(base64Decode(encoded)).toBe('subjects?_d');
  });

  it('rejects invalid input', () => {
    expect(() => base64Decode('not base64!!')).toThrow();
  });
});

describe('base64 tool', () => {
  it('encodes and decodes', async () => {
    const registry = createRegistry([base64Tool()]);
    const encoded = await executeTool(registry, 'base64', {
      text: 'hello',
      mode: 'encode',
    });
    expect(encoded.structuredContent).toMatchObject({text: 'aGVsbG8='});

    const decoded = await executeTool(registry, 'base64', {
      text: 'aGVsbG8=',
      mode: 'decode',
    });
    expect(decoded.structuredContent).toMatchObject({text: 'hello'});
  });

  it('fails on invalid input', async () => {
    const registry = createRegistry([base64Tool()]);
    const output = await executeTool(registry, 'base64', {
      text: '!!!',
      mode: 'decode',
    });
    expect(output.isError).toBe(true);
  });

  it('fails without required arguments', async () => {
    const registry = createRegistry([base64Tool()]);
    expect((await executeTool(registry, 'base64', {})).isError).toBe(true);
    expect((await executeTool(registry, 'base64', {text: 'x'})).isError).toBe(
      true,
    );
  });
});
