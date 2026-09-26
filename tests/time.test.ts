/**
 * @fileoverview Unit tests for the time helpers.
 */

import {describe, expect, it} from 'vitest';

import {
  addTime,
  describeTime,
  diffTime,
  formatTime,
  parseDuration,
  parseTime,
} from '../src/utils/time.js';

describe('parseTime', () => {
  it('parses ISO strings, dates, and epoch values', () => {
    expect(parseTime('2026-09-26T10:00:00.000Z').toISOString()).toBe(
      '2026-09-26T10:00:00.000Z',
    );
    expect(parseTime('2026-09-26').toISOString()).toBe(
      '2026-09-26T00:00:00.000Z',
    );
    expect(parseTime('0').toISOString()).toBe('1970-01-01T00:00:00.000Z');
    expect(parseTime('1700000000').getTime()).toBe(1700000000000);
    expect(parseTime('1700000000000').getTime()).toBe(1700000000000);
  });

  it('rejects empty and unparseable input', () => {
    expect(() => parseTime('')).toThrow();
    expect(() => parseTime('not a date')).toThrow();
  });
});

describe('parseDuration', () => {
  it('parses compact, ISO, and numeric durations', () => {
    expect(parseDuration('1d2h30m')).toBe(95400000);
    expect(parseDuration('-30m')).toBe(-1800000);
    expect(parseDuration('PT1H30M')).toBe(5400000);
    expect(parseDuration('P1DT2H')).toBe(93600000);
    expect(parseDuration('1500')).toBe(1500);
  });

  it('rejects malformed durations', () => {
    expect(() => parseDuration('abc')).toThrow();
    expect(() => parseDuration('1x')).toThrow();
  });
});

describe('addTime', () => {
  it('adds and subtracts durations', () => {
    expect(addTime('2026-01-01T00:00:00Z', '1d').toISOString()).toBe(
      '2026-01-02T00:00:00.000Z',
    );
    expect(addTime('2026-01-02T00:00:00Z', '-2h').toISOString()).toBe(
      '2026-01-01T22:00:00.000Z',
    );
  });
});

describe('diffTime', () => {
  it('reports signed spans in several units', () => {
    const span = diffTime('2026-01-01T00:00:00Z', '2026-01-02T02:30:00Z');
    expect(span.milliseconds).toBe(95400000);
    expect(span.hours).toBe(26);
    expect(span.days).toBe(1);
    expect(span.iso).toBe('P1DT2H30M');
    expect(span.human).toContain('1 day');
    expect(span.human).toContain('2 hours');
  });
});

describe('formatTime and describeTime', () => {
  it('formats tokens in UTC', () => {
    const date = new Date('2026-09-26T10:05:07.250Z');
    expect(formatTime(date, {format: 'YYYY-MM-DD HH:mm:ss'})).toBe(
      '2026-09-26 10:05:07',
    );
    expect(formatTime(date, {format: 'ddd'})).toBe('Sat');
    expect(formatTime(date, {format: 'Z'})).toBe('+00:00');
  });

  it('applies an IANA time zone', () => {
    const date = new Date('2026-09-26T00:00:00.000Z');
    const jakarta = formatTime(date, {
      format: 'YYYY-MM-DD HH:mm',
      timeZone: 'Asia/Jakarta',
    });
    expect(jakarta).toBe('2026-09-26 07:00');
  });

  it('renders a point with multiple representations', () => {
    const point = describeTime(new Date('2026-09-26T10:00:00.000Z'));
    expect(point.epochSeconds).toBe(1790416800);
    expect(point.date).toBe('2026-09-26');
    expect(point.time).toBe('10:00:00');
    expect(point.weekday).toBe('Saturday');
  });
});
