/**
 * @fileoverview Unit tests for file hashing and encoding helpers.
 */

import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterAll, describe, expect, it} from 'vitest';

import {codecFile, hashFile, readFileBytes} from '../src/utils/file.js';

const dir = mkdtempSync(join(tmpdir(), 'agent-toolkit-file-'));
const sample = join(dir, 'sample.txt');
writeFileSync(sample, 'hello world');

afterAll(() => {
  rmSync(dir, {recursive: true, force: true});
});

describe('hashFile', () => {
  it('returns the digest and byte size only', () => {
    const result = hashFile(sample, 'sha256');
    expect(result.bytes).toBe(11);
    expect(result.digest).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    );
  });

  it('supports md5, sha1, and the ProtonHash variants', () => {
    expect(hashFile(sample, 'md5').digest).toBe(
      '5eb63bbbe01eeed093cb22bb8f5acdc3',
    );
    expect(hashFile(sample, 'sha1').digest).toHaveLength(40);
    expect(hashFile(sample, 'protonhash').digest).toHaveLength(8);
    expect(hashFile(sample, 'protonhash64').digest).toMatch(/^\d+$/);
  });

  it('rejects missing files and unsupported algorithms', () => {
    expect(() => hashFile(join(dir, 'nope.txt'), 'sha256')).toThrow();
    // @ts-expect-error: intentional invalid algorithm
    expect(() => hashFile(sample, 'sha999')).toThrow();
  });
});

describe('readFileBytes', () => {
  it('reads the raw bytes', () => {
    expect(readFileBytes(sample).toString('utf8')).toBe('hello world');
  });
});

describe('codecFile', () => {
  it('encodes base64 and hex with a line-wrapped hex body', () => {
    expect(codecFile(sample, 'base64', 'encode').text).toBe('aGVsbG8gd29ybGQ=');
    expect(codecFile(sample, 'hex', 'encode').text).toBe(
      '68656c6c6f20776f726c64',
    );
  });

  it('decodes base64 into a new output file', () => {
    const encoded = join(dir, 'b64.txt');
    writeFileSync(encoded, 'aGVsbG8gd29ybGQ=');
    const output = join(dir, 'decoded.txt');
    const result = codecFile(encoded, 'base64', 'decode', {output});
    expect(result.created).toBe(true);
    expect(readFileSync(output, 'utf8')).toBe('hello world');
  });

  it('refuses to overwrite without the flag, then overwrites with it', () => {
    const output = join(dir, 'guard.txt');
    writeFileSync(output, 'keep');
    const encoded = join(dir, 'b64-2.txt');
    writeFileSync(encoded, 'aGVsbG8=');
    expect(() => codecFile(encoded, 'base64', 'decode', {output})).toThrow();
    expect(readFileSync(output, 'utf8')).toBe('keep');
    const result = codecFile(encoded, 'base64', 'decode', {
      output,
      overwrite: true,
    });
    expect(result.created).toBe(false);
    expect(readFileSync(output, 'utf8')).toBe('hello');
  });
});
