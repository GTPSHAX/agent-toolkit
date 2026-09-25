/**
 * @fileoverview Unit tests for the ROT13 and Morse helpers and tools.
 */

import {describe, expect, it} from 'vitest';

import {createRegistry, executeTool} from '../src/tools/index.js';
import {morseTool, rot13Tool} from '../src/tools/rot13-morse.js';
import {morseDecode, morseEncode, rot13} from '../src/utils/rot13-morse.js';

describe('rot13', () => {
  it('rotates letters and preserves case', () => {
    expect(rot13('Hello')).toBe('Uryyb');
    expect(rot13('uryyb')).toBe('hello');
  });

  it('is its own inverse', () => {
    const text = 'The Quick Brown Fox 123!';
    expect(rot13(rot13(text))).toBe(text);
  });

  it('leaves non-letters unchanged', () => {
    expect(rot13('123!?')).toBe('123!?');
  });
});

describe('morse', () => {
  it('encodes known text', () => {
    expect(morseEncode('SOS')).toBe('... --- ...');
    expect(morseEncode('hi there')).toBe('.... .. / - .... . .-. .');
  });

  it('decodes known code', () => {
    expect(morseDecode('... --- ...')).toBe('SOS');
    expect(morseDecode('.... .. / - .... . .-. .')).toBe('HI THERE');
  });

  it('round-trips supported characters', () => {
    expect(morseDecode(morseEncode('TEST 42'))).toBe('TEST 42');
  });

  it('rejects unknown tokens', () => {
    expect(() => morseDecode('........')).toThrow();
  });
});

describe('rot13 and morse tools', () => {
  it('rot13 transforms text', async () => {
    const registry = createRegistry([rot13Tool()]);
    const output = await executeTool(registry, 'rot13', {text: 'Hello'});
    expect(output.structuredContent).toMatchObject({text: 'Uryyb'});
  });

  it('morse encodes', async () => {
    const registry = createRegistry([morseTool()]);
    const output = await executeTool(registry, 'morse', {
      text: 'SOS',
      mode: 'encode',
    });
    expect(output.structuredContent).toMatchObject({text: '... --- ...'});
  });

  it('morse reports unknown tokens as an error', async () => {
    const registry = createRegistry([morseTool()]);
    const output = await executeTool(registry, 'morse', {
      text: '........',
      mode: 'decode',
    });
    expect(output.isError).toBe(true);
  });
});
