/**
 * @fileoverview Base64 encoding and decoding helpers.
 */

/**
 * @brief Encodes a UTF-8 string as Base64.
 *
 * @param text Input text.
 * @param urlSafe Use the URL-safe alphabet and omit padding.
 * @return Base64 representation of the UTF-8 bytes.
 */
export function base64Encode(text: string, urlSafe = false): string {
  const encoded = Buffer.from(text, 'utf8').toString('base64');
  return urlSafe ? toBase64Url(encoded) : encoded;
}

/**
 * @brief Decodes a Base64 string into UTF-8 text.
 *
 * Accepts both the standard and URL-safe alphabets, with or without padding.
 *
 * @param text Base64 input.
 * @return Decoded UTF-8 text.
 * @throws Error When the input is not valid Base64.
 */
export function base64Decode(text: string): string {
  const normalized = fromBase64Url(text.replace(/\s+/g, ''));
  const buffer = Buffer.from(normalized, 'base64');
  const canonical = buffer.toString('base64').replace(/=+$/, '');
  if (canonical !== normalized.replace(/=+$/, '')) {
    throw new Error('invalid base64 input');
  }
  return buffer.toString('utf8');
}

/**
 * @brief Converts standard Base64 to the URL-safe alphabet.
 *
 * @param value Standard Base64 string.
 * @return URL-safe Base64 string without padding.
 */
function toBase64Url(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * @brief Converts URL-safe Base64 back to the standard alphabet.
 *
 * @param value URL-safe Base64 string.
 * @return Standard Base64 string.
 */
function fromBase64Url(value: string): string {
  return value.replace(/-/g, '+').replace(/_/g, '/');
}
