/**
 * @fileoverview ROT13 and Morse code helpers.
 */

/** International Morse code table for letters, digits, and punctuation. */
const MORSE_TABLE: Readonly<Record<string, string>> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  '.': '.-.-.-',
  ',': '--..--',
  '?': '..--..',
  "'": '.----.',
  '!': '-.-.--',
  '/': '-..-.',
  '(': '-.--.',
  ')': '-.--.-',
  '&': '.-...',
  ':': '---...',
  ';': '-.-.-.',
  '=': '-...-',
  '+': '.-.-.',
  '-': '-....-',
  _: '..--.-',
  '"': '.-..-.',
  $: '...-..-',
  '@': '.--.-.',
};

/** Reverse lookups of {@link MORSE_TABLE}. */
const MORSE_REVERSE: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(MORSE_TABLE).map(([char, code]) => [code, char]),
);

/** Word separator used when encoding Morse. */
export const MORSE_WORD_SEPARATOR = ' / ';

/**
 * @brief Applies ROT13 to ASCII letters, leaving other characters unchanged.
 *
 * @param text Input text.
 * @return Rotated text.
 */
export function rot13(text: string): string {
  return text.replace(/[a-zA-Z]/g, char => {
    const code = char.charCodeAt(0);
    const base = code >= 97 ? 97 : 65;
    return String.fromCharCode(((code - base + 13) % 26) + base);
  });
}

/**
 * @brief Encodes text as Morse code.
 *
 * Letters are separated by a space and words by ` / `. Characters without a
 * Morse representation are dropped.
 *
 * @param text Input text.
 * @return Morse code string.
 */
export function morseEncode(text: string): string {
  return text
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word =>
      [...word]
        .map(char => MORSE_TABLE[char] ?? '')
        .filter(Boolean)
        .join(' '),
    )
    .filter(Boolean)
    .join(MORSE_WORD_SEPARATOR);
}

/**
 * @brief Decodes Morse code into text.
 *
 * @param text Morse input; tokens are separated by whitespace and words by
 *   `/`.
 * @return Decoded text.
 * @throws Error When the input contains an unknown Morse token.
 */
export function morseDecode(text: string): string {
  const words = text.trim().split(/\s*\/\s*/);
  const decoded = words.map(word =>
    word
      .split(/\s+/)
      .filter(Boolean)
      .map(token => {
        const char = MORSE_REVERSE[token];
        if (char === undefined) {
          throw new Error(`unknown morse token: ${token}`);
        }
        return char;
      })
      .join(''),
  );
  return decoded.join(' ');
}
