/**
 * @fileoverview Unit tests for the UUID helper and tool.
 */

import {describe, expect, it} from 'vitest';

import {createRegistry, executeTool} from '../src/tools/index.js';
import {uuidTool} from '../src/tools/uuid.js';
import {
  MAX_UUID,
  NIL_UUID,
  generateUuid,
  validateUuid,
} from '../src/utils/uuid.js';

describe('generateUuid', () => {
  it('produces a valid version 4 UUID', () => {
    const value = generateUuid();
    const validation = validateUuid(value);
    expect(validation.valid).toBe(true);
    expect(validation.version).toBe(4);
    expect(validation.variant).toBe('rfc9562');
  });

  it('produces unique values', () => {
    const values = new Set(Array.from({length: 50}, () => generateUuid()));
    expect(values.size).toBe(50);
  });

  it('supports uppercase output', () => {
    const value = generateUuid(true);
    expect(value).toBe(value.toUpperCase());
    expect(validateUuid(value).valid).toBe(true);
  });
});

describe('validateUuid', () => {
  it('accepts the nil and max UUIDs', () => {
    expect(validateUuid(NIL_UUID)).toMatchObject({valid: true, variant: 'ncs'});
    expect(validateUuid(MAX_UUID)).toMatchObject({
      valid: true,
      variant: 'future',
    });
  });

  it('normalizes case and whitespace', () => {
    const result = validateUuid('  550E8400-E29B-41D4-A716-446655440000  ');
    expect(result.normalized).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.version).toBe(4);
  });

  it('rejects malformed strings', () => {
    expect(validateUuid('not-a-uuid').valid).toBe(false);
    expect(validateUuid('550e8400e29b41d4a716446655440000').valid).toBe(false);
    expect(validateUuid('550e8400-e29b-41d4-a716-44665544000g').valid).toBe(
      false,
    );
  });
});

describe('uuid tool', () => {
  it('generates the requested count', async () => {
    const registry = createRegistry([uuidTool()]);
    const output = await executeTool(registry, 'uuid', {
      action: 'generate',
      count: 3,
    });
    expect(output.isError).toBe(false);
    expect((output.structuredContent as {uuids: string[]}).uuids).toHaveLength(
      3,
    );
  });

  it('validates a value', async () => {
    const registry = createRegistry([uuidTool()]);
    const output = await executeTool(registry, 'uuid', {
      action: 'validate',
      value: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(output.structuredContent).toMatchObject({valid: true, version: 4});
  });

  it('rejects an out-of-range count', async () => {
    const registry = createRegistry([uuidTool()]);
    expect(
      (
        await executeTool(registry, 'uuid', {
          action: 'generate',
          count: 0,
        })
      ).isError,
    ).toBe(true);
    expect(
      (
        await executeTool(registry, 'uuid', {
          action: 'generate',
          count: 101,
        })
      ).isError,
    ).toBe(true);
  });

  it('requires a value to validate', async () => {
    const registry = createRegistry([uuidTool()]);
    expect(
      (await executeTool(registry, 'uuid', {action: 'validate'})).isError,
    ).toBe(true);
  });
});
