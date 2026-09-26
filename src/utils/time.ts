/**
 * @fileoverview Time parsing, formatting, arithmetic, and difference helpers.
 *
 * All formatting accepts an IANA time zone through `Intl.DateTimeFormat`, so
 * named zones work without any runtime dependency.
 */

import type {TimePoint, TimeSpan} from '../types/time.js';

/** Default locale used when formatting. */
export const DEFAULT_TIME_LOCALE = 'en-US';

/** Default format string used when none is provided. */
export const DEFAULT_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/** Token patterns supported by {@link formatTime}. */
const TOKEN_PATTERN = /YYYY|YY|MM|DD|HH|mm|ss|SSS|dddd|ddd|Z|[+-]\d{2}:\d{2}/g;

/** Duration units expressed in milliseconds. */
const UNITS: Readonly<Record<string, number>> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

/**
 * @brief Parses a timestamp into a `Date`.
 *
 * Accepts `now`, ISO 8601 strings, `YYYY-MM-DD`, and epoch values (seconds or
 * milliseconds). Numeric strings of 10 digits are treated as seconds and 13
 * digits as milliseconds.
 *
 * @param input Timestamp text.
 * @return The parsed date.
 * @throws Error When the input is not a recognizable timestamp.
 */
export function parseTime(input: string): Date {
  const text = input.trim();
  if (text.length === 0) {
    throw new Error('time value is empty');
  }
  if (text.toLowerCase() === 'now') {
    return new Date();
  }
  if (/^-?\d+$/.test(text)) {
    const value = Number(text);
    const digits = text.replace('-', '').length;
    const ms = digits <= 10 ? value * 1000 : value;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`invalid epoch value "${input}"`);
    }
    return date;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`cannot parse time "${input}"`);
  }
  return date;
}

/**
 * @brief Adds a duration to a timestamp.
 *
 * Accepts a compact duration such as `1d2h30m`, an ISO 8601 duration such as
 * `PT1H30M`, or a plain number of milliseconds.
 *
 * @param input Base timestamp.
 * @param duration Duration to add; a leading `-` subtracts.
 * @return The resulting date.
 * @throws Error When the timestamp or duration is invalid.
 */
export function addTime(input: string, duration: string): Date {
  const base = parseTime(input);
  return new Date(base.getTime() + parseDuration(duration));
}

/**
 * @brief Parses a duration into milliseconds.
 *
 * @param duration Compact, ISO 8601, or numeric duration.
 * @return Signed duration in milliseconds.
 * @throws Error When the duration cannot be parsed.
 */
export function parseDuration(duration: string): number {
  const text = duration.trim();
  if (text.length === 0) {
    throw new Error('duration is empty');
  }
  if (/^[+-]?\d+$/.test(text)) {
    return Number(text);
  }
  if (/^[+-]?P/i.test(text)) {
    return parseIsoDuration(text);
  }
  const sign = text.startsWith('-') ? -1 : 1;
  const body = text.replace(/^[+-]/, '');
  const re = /(\d+(?:\.\d+)?)(ms|s|m|h|d|w)/g;
  let total = 0;
  let matchedLength = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const factor = UNITS[match[2] ?? ''];
    if (factor === undefined) {
      continue;
    }
    total += Number(match[1]) * factor;
    matchedLength += match[0].length;
  }
  if (matchedLength !== body.length || matchedLength === 0) {
    throw new Error(`cannot parse duration "${duration}"`);
  }
  return sign * total;
}

/**
 * @brief Parses an ISO 8601 duration into milliseconds.
 *
 * @param duration ISO duration such as `P1DT2H3M4S`.
 * @return Signed duration in milliseconds.
 * @throws Error When the duration is malformed.
 */
function parseIsoDuration(duration: string): number {
  const match =
    /^([+-]?)P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(
      duration.trim(),
    );
  if (match === null) {
    throw new Error(`cannot parse ISO duration "${duration}"`);
  }
  const sign = match[1] === '-' ? -1 : 1;
  const [, , weeks, days, hours, minutes, seconds] = match;
  const total =
    Number(weeks ?? 0) * UNITS['w']! +
    Number(days ?? 0) * UNITS['d']! +
    Number(hours ?? 0) * UNITS['h']! +
    Number(minutes ?? 0) * UNITS['m']! +
    Number(seconds ?? 0) * UNITS['s']!;
  return sign * total;
}

/**
 * @brief Computes the span between two timestamps.
 *
 * @param from Start timestamp.
 * @param to End timestamp.
 * @return The signed difference in several units, plus ISO and human forms.
 * @throws Error When either timestamp is invalid.
 */
export function diffTime(from: string, to: string): TimeSpan {
  const start = parseTime(from).getTime();
  const end = parseTime(to).getTime();
  const ms = end - start;
  return {
    milliseconds: ms,
    seconds: Math.trunc(ms / 1000),
    minutes: Math.trunc(ms / 60000),
    hours: Math.trunc(ms / 3600000),
    days: Math.trunc(ms / 86400000),
    iso: formatIsoDuration(ms),
    human: formatHumanDuration(ms),
  };
}

/**
 * @brief Renders a timestamp in several representations.
 *
 * @param date Date to render.
 * @param options Optional format string, time zone, and locale.
 * @return Timestamp representations in UTC plus the requested format.
 */
export function describeTime(
  date: Date,
  options: {
    format?: string;
    timeZone?: string;
    locale?: string;
  } = {},
): TimePoint {
  const iso = date.toISOString();
  const zone = options.timeZone;
  const formatted = formatTime(date, {
    ...(options.format === undefined ? {} : {format: options.format}),
    ...(zone === undefined ? {} : {timeZone: zone}),
    ...(options.locale === undefined ? {} : {locale: options.locale}),
  });
  const weekday = weekdayName(
    date,
    zone,
    options.locale ?? DEFAULT_TIME_LOCALE,
  );
  return {
    iso,
    epochSeconds: Math.floor(date.getTime() / 1000),
    epochMs: date.getTime(),
    http: date.toUTCString(),
    date: iso.slice(0, 10),
    time: iso.slice(11, 19),
    formatted,
    weekday,
    week: weekNumber(date),
  };
}

/**
 * @brief Formats a date using token patterns.
 *
 * @param date Date to format.
 * @param options Format string, time zone, and locale.
 * @return Formatted string.
 * @throws Error When the time zone is not a valid IANA zone.
 */
export function formatTime(
  date: Date,
  options: {
    format?: string;
    timeZone?: string;
    locale?: string;
  } = {},
): string {
  const format = options.format ?? DEFAULT_TIME_FORMAT;
  const zone = options.timeZone;
  const locale = options.locale ?? DEFAULT_TIME_LOCALE;
  const parts = zonedParts(date, zone, locale);
  const offset = zoneOffset(date, zone);
  return format.replace(TOKEN_PATTERN, token => {
    switch (token) {
      case 'YYYY':
        return parts.year;
      case 'YY':
        return parts.year.slice(-2);
      case 'MM':
        return parts.month;
      case 'DD':
        return parts.day;
      case 'HH':
        return parts.hour;
      case 'mm':
        return parts.minute;
      case 'ss':
        return parts.second;
      case 'SSS':
        return String(date.getUTCMilliseconds()).padStart(3, '0');
      case 'dddd':
        return weekdayName(date, zone, locale);
      case 'ddd':
        return weekdayName(date, zone, locale).slice(0, 3);
      case 'Z':
        return offset;
      default:
        return token;
    }
  });
}

/**
 * @brief Extracts calendar parts for a date in a time zone.
 *
 * @param date Date to inspect.
 * @param timeZone Optional IANA time zone; UTC when omitted.
 * @param locale Locale driving month and weekday names.
 * @return Zero-padded year, month, day, hour, minute, and second.
 */
function zonedParts(
  date: Date,
  timeZone: string | undefined,
  locale: string,
): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
} {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: timeZone ?? 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    map[part.type] = part.value;
  }
  return {
    year: map['year'] ?? String(date.getUTCFullYear()),
    month: (map['month'] ?? '').padStart(2, '0'),
    day: (map['day'] ?? '').padStart(2, '0'),
    hour: (map['hour'] ?? '00').padStart(2, '0'),
    minute: (map['minute'] ?? '00').padStart(2, '0'),
    second: (map['second'] ?? '00').padStart(2, '0'),
  };
}

/**
 * @brief Returns the weekday name for a date in a time zone.
 *
 * @param date Date to inspect.
 * @param timeZone Optional IANA time zone.
 * @param locale Locale driving the name.
 * @return Weekday name.
 */
function weekdayName(
  date: Date,
  timeZone: string | undefined,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timeZone ?? 'UTC',
    weekday: 'long',
  }).format(date);
}

/**
 * @brief Computes the UTC offset of a zone for a date.
 *
 * @param date Date to inspect.
 * @param timeZone Optional IANA time zone; UTC when omitted.
 * @return Offset formatted as `+HH:MM` or `-HH:MM`.
 */
function zoneOffset(date: Date, timeZone: string | undefined): string {
  if (timeZone === undefined) {
    return '+00:00';
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  });
  const name =
    formatter.formatToParts(date).find(part => part.type === 'timeZoneName')
      ?.value ?? 'GMT+00:00';
  const offset = name.replace('GMT', '');
  return offset.length === 0 ? '+00:00' : offset;
}

/**
 * @brief Returns the ISO 8601 week number for a date.
 *
 * @param date Date to inspect.
 * @return Week number between 1 and 53.
 */
function weekNumber(date: Date): number {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const start = Date.UTC(target.getUTCFullYear(), 0, 1);
  return Math.ceil(((target.getTime() - start) / 86400000 + 1) / 7);
}

/**
 * @brief Formats a millisecond span as an ISO 8601 duration.
 *
 * @param ms Signed duration in milliseconds.
 * @return ISO duration such as `P1DT2H3M4S`.
 */
function formatIsoDuration(ms: number): string {
  const sign = ms < 0 ? '-' : '';
  let remaining = Math.abs(ms);
  const days = Math.trunc(remaining / UNITS['d']!);
  remaining -= days * UNITS['d']!;
  const hours = Math.trunc(remaining / UNITS['h']!);
  remaining -= hours * UNITS['h']!;
  const minutes = Math.trunc(remaining / UNITS['m']!);
  remaining -= minutes * UNITS['m']!;
  const seconds = Math.trunc(remaining / UNITS['s']!);
  const time = `${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${
    seconds ? `${seconds}S` : ''
  }`;
  const date = `${days ? `${days}D` : ''}${time ? `T${time}` : ''}`;
  return `${sign}P${date.length > 0 ? date : 'T0S'}`;
}

/**
 * @brief Formats a millisecond span in human-readable units.
 *
 * @param ms Signed duration in milliseconds.
 * @return Summary such as `1 day, 2 hours`.
 */
function formatHumanDuration(ms: number): string {
  const sign = ms < 0 ? '-' : '';
  let remaining = Math.abs(ms);
  const parts: string[] = [];
  for (const [unit, factor] of [
    ['week', UNITS['w']!],
    ['day', UNITS['d']!],
    ['hour', UNITS['h']!],
    ['minute', UNITS['m']!],
    ['second', UNITS['s']!],
  ] as const) {
    const value = Math.trunc(remaining / factor);
    if (value > 0) {
      parts.push(`${value} ${unit}${value === 1 ? '' : 's'}`);
      remaining -= value * factor;
    }
  }
  return parts.length === 0 ? '0 seconds' : `${sign}${parts.join(', ')}`;
}
