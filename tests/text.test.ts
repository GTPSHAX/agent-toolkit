/**
 * @fileoverview Unit tests for the text utilities.
 */

import {describe, expect, it} from 'vitest';

import {center, parseArgv, repeatChar, truncate} from '../src/utils/text.js';

describe('parseArgv', () => {
  it('separates command, positionals, and options', () => {
    const parsed = parseArgv(['run', 'echo', '--limit', '5', '-v', 'extra']);
    expect(parsed.command).toBe('run');
    expect(parsed.positional).toEqual(['echo', 'extra']);
    expect(parsed.options).toEqual({limit: '5'});
    expect(parsed.flags).toEqual(['v']);
  });

  it('supports inline equals syntax', () => {
    const parsed = parseArgv(['--name=value']);
    expect(parsed.options).toEqual({name: 'value'});
  });

  it('treats tokens after -- as positional, not options', () => {
    const parsed = parseArgv(['run', '--', '--literal']);
    expect(parsed.command).toBe('run');
    expect(parsed.positional).toEqual(['--literal']);
    expect(parsed.options).toEqual({});
  });
});

describe('truncate', () => {
  it('returns short text unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('appends a marker when cutting', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('never exceeds the maximum length', () => {
    expect(truncate('abcdef', 2)).toHaveLength(2);
  });
});

describe('repeatChar and center', () => {
  it('repeats a character the requested number of times', () => {
    expect(repeatChar('-', 3)).toBe('---');
    expect(repeatChar('-', -1)).toBe('');
  });

  it('centres text within a width', () => {
    expect(center('ab', 6)).toBe('  ab  ');
  });
});
