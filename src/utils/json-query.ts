/**
 * @fileoverview JSON path evaluation helpers for the `json.query` tool.
 *
 * The path syntax is a jq-like subset: dot-separated keys, `[index]` for
 * arrays, `[]` to iterate every array element, and `*` as an object wildcard.
 */

import type {JsonValue} from '../types/common.js';
import type {JsonQueryMatch, JsonQueryResult} from '../types/json.js';

/** Object wildcard token. */
const WILDCARD = '*';

/** A parsed path step. */
type Step =
  | {readonly kind: 'key'; readonly key: string}
  | {readonly kind: 'index'; readonly index: number}
  | {readonly kind: 'iterate'}
  | {readonly kind: 'wildcard'};

/**
 * @brief Evaluates a JSON path against a parsed document.
 *
 * @param document Parsed JSON value.
 * @param query JSON path expression.
 * @return Selected values with their canonical paths, or an error.
 */
export function queryJson(document: JsonValue, query: string): JsonQueryResult {
  let steps: Step[];
  try {
    steps = parsePath(query);
  } catch (cause) {
    return {
      query,
      count: 0,
      matches: [],
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
  let current: JsonQueryMatch[] = [{path: '$', value: document}];
  for (const step of steps) {
    current = current.flatMap(entry => applyStep(entry, step));
  }
  const single = current.length === 1 ? current[0] : undefined;
  return {
    query,
    count: current.length,
    matches: current,
    ...(single === undefined ? {} : {value: single.value}),
  };
}

/**
 * @brief Parses a JSON path into steps.
 *
 * @param query Path expression, optionally prefixed with `$` or `.`.
 * @return Ordered path steps.
 * @throws Error When the expression is malformed or empty.
 */
export function parsePath(query: string): Step[] {
  const steps: Step[] = [];
  const source = query.trim().replace(/^\$/, '').replace(/^\./, '');
  const re = /\[\s*(-?\d+)?\s*\]|([A-Za-z0-9_$-]+|\*)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    assertSeparator(source.slice(cursor, match.index));
    cursor = re.lastIndex;
    if (match[0].startsWith('[')) {
      steps.push(
        match[1] === undefined
          ? {kind: 'iterate'}
          : {kind: 'index', index: Number(match[1])},
      );
      continue;
    }
    const token = match[2] ?? '';
    steps.push(
      token === WILDCARD ? {kind: 'wildcard'} : {kind: 'key', key: token},
    );
  }
  assertSeparator(source.slice(cursor));
  if (steps.length === 0) {
    throw new Error('path is empty');
  }
  return steps;
}

/**
 * @brief Validates the text between two path tokens.
 *
 * @param gap Text between the previous token and the next one.
 * @return Nothing; throws when the separator is neither empty nor a single dot.
 * @throws Error When the gap is not a valid separator.
 */
function assertSeparator(gap: string): void {
  if (gap !== '' && gap !== '.') {
    throw new Error(`unexpected "${gap}" in path`);
  }
}

/**
 * @brief Applies one path step to a matched value.
 *
 * @param entry Current match with its path.
 * @param step Step to apply.
 * @return Zero or more matches produced by the step.
 */
function applyStep(entry: JsonQueryMatch, step: Step): JsonQueryMatch[] {
  const value = entry.value;
  switch (step.kind) {
    case 'key': {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return [];
      }
      if (!(step.key in value)) {
        return [];
      }
      return [
        {
          path: `${entry.path}.${step.key}`,
          value: value[step.key] as JsonValue,
        },
      ];
    }
    case 'index': {
      if (!Array.isArray(value)) {
        return [];
      }
      const target = step.index < 0 ? value.length + step.index : step.index;
      const selected = value[target];
      if (target < 0 || selected === undefined) {
        return [];
      }
      return [{path: `${entry.path}[${target}]`, value: selected}];
    }
    case 'iterate': {
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map((item, offset) => ({
        path: `${entry.path}[${offset}]`,
        value: item,
      }));
    }
    case 'wildcard': {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return [];
      }
      return Object.entries(value).map(([key, item]) => ({
        path: `${entry.path}.${key}`,
        value: item as JsonValue,
      }));
    }
    default:
      return [];
  }
}
