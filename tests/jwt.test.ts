/**
 * @fileoverview Unit tests for the JWT helper and tool.
 */

import {describe, expect, it} from 'vitest';

import {createRegistry, executeTool} from '../src/tools/index.js';
import {jwtTool} from '../src/tools/jwt.js';
import {decodeJwt} from '../src/utils/jwt.js';

/** Well-known sample token (header.payload.signature). */
const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ' +
  '.abc_DEF';

describe('decodeJwt', () => {
  it('decodes header and payload', () => {
    const parts = decodeJwt(SAMPLE);
    expect(parts.header).toEqual({alg: 'HS256', typ: 'JWT'});
    expect(parts.payload).toEqual({
      sub: '1234567890',
      name: 'John Doe',
      iat: 1516239022,
    });
    expect(parts.signature).toBe('abc_DEF');
  });

  it('rejects tokens without three segments', () => {
    expect(() => decodeJwt('a.b')).toThrow();
    expect(() => decodeJwt('')).toThrow();
  });

  it('rejects segments that are not JSON', () => {
    const bad = `${Buffer.from('not json').toString('base64url')}.e30.x`;
    expect(() => decodeJwt(bad)).toThrow();
  });

  it('rejects segments outside the base64url alphabet', () => {
    expect(() => decodeJwt('aa!!.e30.x')).toThrow();
  });
});

describe('jwt tool', () => {
  it('returns decoded parts in structuredContent', async () => {
    const registry = createRegistry([jwtTool()]);
    const output = await executeTool(registry, 'jwt', {token: SAMPLE});
    expect(output.isError).toBe(false);
    expect(output.structuredContent).toMatchObject({
      header: {alg: 'HS256'},
      payload: {sub: '1234567890'},
    });
  });

  it('fails on malformed tokens', async () => {
    const registry = createRegistry([jwtTool()]);
    expect((await executeTool(registry, 'jwt', {token: 'x'})).isError).toBe(
      true,
    );
    expect(
      (await executeTool(registry, 'jwt', {token: 'not.a.jwt'})).isError,
    ).toBe(true);
  });

  it('fails when the token is missing', async () => {
    const registry = createRegistry([jwtTool()]);
    expect((await executeTool(registry, 'jwt', {})).isError).toBe(true);
  });
});
