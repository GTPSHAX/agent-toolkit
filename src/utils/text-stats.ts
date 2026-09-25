/**
 * @fileoverview Text analysis helpers.
 */

import type {TextStats} from '../types/text.js';

/** Matches runs of word characters, including Unicode letters. */
const WORD_PATTERN = /[\p{L}\p{N}_'-]+/gu;

/** Matches sentence terminators. */
const SENTENCE_TERMINATOR = /[.!?]+/g;

/**
 * @brief Computes statistics for a block of text.
 *
 * @param text Input text.
 * @return Counts and derived values describing `text`.
 */
export function computeTextStats(text: string): TextStats {
  const characters = [...text].length;
  const charactersNoSpaces = [...text].filter(char => !/\s/u.test(char)).length;
  const words = text.match(WORD_PATTERN) ?? [];
  const lines = text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length;
  const sentences = countSentences(text);
  const uniqueWords = new Set(words.map(word => word.toLowerCase())).size;
  const longestWord = words.reduce(
    (longest, word) => (word.length > longest.length ? word : longest),
    '',
  );
  return {
    characters,
    charactersNoSpaces,
    words: words.length,
    lines,
    sentences,
    uniqueWords,
    longestWord,
  };
}

/**
 * @brief Counts sentences terminated by a period, exclamation, or question.
 *
 * A trailing fragment without a terminator counts as one sentence.
 *
 * @param text Input text.
 * @return Sentence count; zero when there are no word tokens.
 */
function countSentences(text: string): number {
  const terminators = text.match(SENTENCE_TERMINATOR)?.length ?? 0;
  const hasTrailingFragment = /[^\s.!?][\s]*$/u.test(text);
  if (terminators === 0) {
    return hasTrailingFragment ? 1 : 0;
  }
  return terminators + (hasTrailingFragment ? 1 : 0);
}
