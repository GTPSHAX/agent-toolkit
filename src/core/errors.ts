/**
 * @fileoverview Error type used to signal tool and toolkit failures.
 */

import type {ToolkitErrorPayload} from '../types/tools.js';

/**
 * @brief Error carrying a stable, machine-readable code.
 */
export class ToolkitError extends Error {
  /** Stable error code, for example `UNKNOWN_TOOL`. */
  readonly code: string;

  /**
   * @param code Stable error code.
   * @param message Human-readable description of the failure.
   * @param options Optional underlying cause.
   */
  constructor(code: string, message: string, options?: {cause?: unknown}) {
    super(message, options);
    this.name = 'ToolkitError';
    this.code = code;
  }

  /**
   * @brief Converts the error into a JSON-serializable payload.
   *
   * @return Payload containing `code` and `message`.
   */
  toPayload(): ToolkitErrorPayload {
    return {code: this.code, message: this.message};
  }
}
