/**
 * @fileoverview URL and HTML entity encoding helpers.
 */

/** Named HTML entities handled by the decoder. */
const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};

/**
 * @brief Percent-encodes a URL component.
 *
 * @param text Input text.
 * @param full When true, keeps characters that are valid in a whole URL.
 * @return Percent-encoded string.
 */
export function urlEncode(text: string, full = false): string {
  return full ? encodeURI(text) : encodeURIComponent(text);
}

/**
 * @brief Decodes a percent-encoded URL component.
 *
 * @param text Percent-encoded input.
 * @param full When true, decodes a whole URL rather than a component.
 * @return Decoded string.
 * @throws URIError When the input contains malformed escape sequences.
 */
export function urlDecode(text: string, full = false): string {
  return full ? decodeURI(text) : decodeURIComponent(text);
}

/**
 * @brief Encodes HTML-significant characters as entities.
 *
 * @param text Input text.
 * @return Text with `&`, `<`, `>`, `"`, and `'` replaced by entities.
 */
export function htmlEncode(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @brief Decodes named, decimal, and hexadecimal HTML entities.
 *
 * @param text Input text.
 * @return Text with recognized entities replaced by their characters.
 */
export function htmlDecode(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) =>
      decodeCodePoint(Number.parseInt(hex, 16), match),
    )
    .replace(/&#(\d+);/g, (match, dec) =>
      decodeCodePoint(Number.parseInt(dec, 10), match),
    )
    .replace(
      /&([a-zA-Z]+);/g,
      (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match,
    );
}

/**
 * @brief Converts a numeric code point to a character when valid.
 *
 * @param codePoint Numeric code point.
 * @param fallback Value returned when the code point is invalid.
 * @return The decoded character or `fallback`.
 */
function decodeCodePoint(codePoint: number, fallback: string): string {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return fallback;
  }
  return String.fromCodePoint(codePoint);
}
