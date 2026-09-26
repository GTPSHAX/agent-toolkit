/**
 * @fileoverview CSV and TSV parsing and serialization helpers.
 */

import type {CsvTable} from '../types/csv.js';
import type {JsonValue} from '../types/common.js';

/** Default field delimiter. */
export const DEFAULT_DELIMITER = ',';

/** Tab delimiter used for TSV. */
export const TAB_DELIMITER = '\t';

/** Default end-of-line sequence for serialization. */
export const DEFAULT_EOL = '\n';

/**
 * @brief Parses delimited text into a table.
 *
 * Handles quoted fields, escaped quotes (`""`), and embedded newlines. When
 * `header` is true, the first row supplies column names; otherwise columns are
 * named `col1`, `col2`, and so on.
 *
 * @param text Delimited text.
 * @param options Delimiter, header flag, and empty-line handling.
 * @return Columns and row objects.
 */
export function parseCsv(
  text: string,
  options: {
    delimiter?: string;
    header?: boolean;
    skipEmptyLines?: boolean;
  } = {},
): CsvTable {
  const delimiter = options.delimiter ?? DEFAULT_DELIMITER;
  const header = options.header ?? true;
  const skipEmptyLines = options.skipEmptyLines ?? true;
  const records = tokenize(text, delimiter).filter(
    record => !skipEmptyLines || record.some(field => field.length > 0),
  );
  if (records.length === 0) {
    return {columns: [], rows: [], rowCount: 0};
  }
  const width = Math.max(...records.map(record => record.length));
  const first = records[0] ?? [];
  const columns = header
    ? normalizeColumns(first, width)
    : Array.from({length: width}, (_, index) => `col${index + 1}`);
  const body = header ? records.slice(1) : records;
  const rows = body.map(record => {
    const row: Record<string, string> = {};
    columns.forEach((column, index) => {
      row[column] = record[index] ?? '';
    });
    return row;
  });
  return {columns, rows, rowCount: rows.length};
}

/**
 * @brief Serializes records into delimited text.
 *
 * Accepts an array of objects (keys become the header) or an array of arrays
 * (an explicit `columns` header may be supplied). Fields containing the
 * delimiter, a quote, or a newline are quoted.
 *
 * @param data Records to serialize.
 * @param options Delimiter, column order, header inclusion, and line ending.
 * @return Delimited text.
 * @throws Error When `data` is not an array of objects or arrays.
 */
export function stringifyCsv(
  data: JsonValue,
  options: {
    delimiter?: string;
    columns?: readonly string[];
    header?: boolean;
    eol?: string;
  } = {},
): string {
  const delimiter = options.delimiter ?? DEFAULT_DELIMITER;
  const eol = options.eol ?? DEFAULT_EOL;
  const header = options.header ?? true;
  if (!Array.isArray(data)) {
    throw new Error('data must be an array');
  }
  const objects = data.filter(
    (row): row is Record<string, JsonValue> =>
      row !== null && typeof row === 'object' && !Array.isArray(row),
  );
  const arrays = data.filter((row): row is JsonValue[] => Array.isArray(row));
  if (objects.length !== data.length && arrays.length !== data.length) {
    throw new Error('data must contain only objects or only arrays');
  }
  const lines: string[] = [];
  if (arrays.length === data.length) {
    const columns =
      options.columns ?? (arrays[0] ?? []).map((_, index) => `col${index + 1}`);
    if (header && options.columns === undefined) {
      lines.push(
        columns.map(field => encodeField(field, delimiter)).join(delimiter),
      );
    }
    for (const row of arrays) {
      lines.push(
        row
          .map(field => encodeField(stringify(field), delimiter))
          .join(delimiter),
      );
    }
    return lines.join(eol);
  }
  const columns = options.columns ?? [
    ...new Set(objects.flatMap(row => Object.keys(row))),
  ];
  if (header) {
    lines.push(
      columns.map(field => encodeField(field, delimiter)).join(delimiter),
    );
  }
  for (const row of objects) {
    lines.push(
      columns
        .map(column => encodeField(stringify(row[column] ?? ''), delimiter))
        .join(delimiter),
    );
  }
  return lines.join(eol);
}

/**
 * @brief Splits delimited text into records of fields.
 *
 * @param text Delimited text.
 * @param delimiter Field delimiter.
 * @return One array of fields per record.
 */
function tokenize(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let fields: string[] = [];
  let field = '';
  let quoted = false;
  const source = text.replace(/\r\n?/g, '\n');
  for (let index = 0; index < source.length; index++) {
    const char = source[index] ?? '';
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && field.length === 0) {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      fields.push(field);
      field = '';
      continue;
    }
    if (char === '\n') {
      fields.push(field);
      records.push(fields);
      fields = [];
      field = '';
      continue;
    }
    field += char;
  }
  if (field.length > 0 || fields.length > 0) {
    fields.push(field);
    records.push(fields);
  }
  return records;
}

/**
 * @brief Builds unique column names, filling blanks and duplicates.
 *
 * @param first Header row values.
 * @param width Total column count.
 * @return Column names of length `width`.
 */
function normalizeColumns(first: readonly string[], width: number): string[] {
  const used = new Set<string>();
  return Array.from({length: width}, (_, index) => {
    let name = (first[index] ?? '').trim() || `col${index + 1}`;
    if (used.has(name)) {
      let suffix = 2;
      while (used.has(`${name}_${suffix}`)) {
        suffix++;
      }
      name = `${name}_${suffix}`;
    }
    used.add(name);
    return name;
  });
}

/**
 * @brief Quotes a field when it contains structural characters.
 *
 * @param value Field value.
 * @param delimiter Field delimiter.
 * @return Encoded field.
 */
function encodeField(value: string, delimiter: string): string {
  if (
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * @brief Renders a JSON value as a CSV field string.
 *
 * @param value JSON value.
 * @return Primitive string, or compact JSON for objects and arrays.
 */
function stringify(value: JsonValue): string {
  if (value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}
