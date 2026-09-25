/**
 * @fileoverview Hexadecimal and binary encoding helpers.
 */

/**
 * @brief Encodes a UTF-8 string as lowercase hexadecimal.
 *
 * @param text Input text.
 * @param upper Use uppercase hex digits.
 * @return Hex representation of the UTF-8 bytes.
 */
export function hexEncode(text: string, upper = false): string {
  const hex = Buffer.from(text, 'utf8').toString('hex');
  return upper ? hex.toUpperCase() : hex;
}

/**
 * @brief Decodes a hexadecimal string into UTF-8 text.
 *
 * @param text Hex input; whitespace is ignored.
 * @return Decoded UTF-8 text.
 * @throws Error When the input is not valid hexadecimal.
 */
export function hexDecode(text: string): string {
  const compact = text.replace(/\s+/g, '');
  if (!/^[0-9a-fA-F]*$/.test(compact) || compact.length % 2 !== 0) {
    throw new Error('invalid hex input');
  }
  return Buffer.from(compact, 'hex').toString('utf8');
}

/**
 * @brief Encodes a UTF-8 string as an 8-bit binary string.
 *
 * @param text Input text.
 * @param separator Optional separator inserted between byte groups.
 * @return Binary representation of the UTF-8 bytes.
 */
export function binaryEncode(text: string, separator = ' '): string {
  return [...Buffer.from(text, 'utf8')]
    .map(byte => byte.toString(2).padStart(8, '0'))
    .join(separator);
}

/**
 * @brief Decodes an 8-bit binary string into UTF-8 text.
 *
 * @param text Binary input; any whitespace is ignored.
 * @return Decoded UTF-8 text.
 * @throws Error When the input is not valid binary.
 */
export function binaryDecode(text: string): string {
  const compact = text.replace(/\s+/g, '');
  if (compact.length === 0) {
    return '';
  }
  if (!/^[01]+$/.test(compact) || compact.length % 8 !== 0) {
    throw new Error('invalid binary input');
  }
  const bytes: number[] = [];
  for (let index = 0; index < compact.length; index += 8) {
    bytes.push(Number.parseInt(compact.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes).toString('utf8');
}
