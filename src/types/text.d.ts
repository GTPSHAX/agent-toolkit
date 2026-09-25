/**
 * @fileoverview Types for text analysis tools.
 */

import type {JsonObject} from './common.js';

/** Statistics computed from a block of text. */
export interface TextStats extends JsonObject {
  /** Number of Unicode code points. */
  readonly characters: number;
  /** Number of Unicode code points that are not whitespace. */
  readonly charactersNoSpaces: number;
  /** Number of word tokens. */
  readonly words: number;
  /** Number of lines; zero for an empty string. */
  readonly lines: number;
  /** Number of sentences terminated by `.`, `!`, or `?`. */
  readonly sentences: number;
  /** Number of distinct word tokens, compared case-insensitively. */
  readonly uniqueWords: number;
  /** Longest word token; empty when there are no tokens. */
  readonly longestWord: string;
}
