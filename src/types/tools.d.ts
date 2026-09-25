/**
 * @fileoverview Tool contract types, aligned with the Model Context Protocol
 * `tools/call` result shape (`content`, `structuredContent`, `isError`).
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/server/tools
 */

import type {JsonObject, JsonValue} from './common.js';

/** A JSON Schema subset used to describe tool input and output. */
export interface JsonSchema {
  readonly $schema?: string;
  readonly type?: string;
  readonly title?: string;
  readonly description?: string;
  readonly properties?: {readonly [key: string]: JsonSchema};
  readonly required?: readonly string[];
  readonly items?: JsonSchema;
  readonly enum?: readonly JsonValue[];
  readonly additionalProperties?: boolean;
}

/** A text block returned by a tool. */
export interface TextContent {
  readonly type: 'text';
  readonly text: string;
}

/** A base64-encoded image block returned by a tool. */
export interface ImageContent {
  readonly type: 'image';
  readonly data: string;
  readonly mimeType: string;
}

/** A link to an external resource returned by a tool. */
export interface ResourceLinkContent {
  readonly type: 'resource_link';
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType?: string;
}

/** Any content block a tool may return. */
export type ContentItem = TextContent | ImageContent | ResourceLinkContent;

/**
 * @brief Result of a single tool call.
 */
export interface ToolOutput {
  /** Unstructured content; must contain at least one item. */
  readonly content: readonly ContentItem[];
  /** Optional machine-readable result that conforms to `outputSchema`. */
  readonly structuredContent?: JsonValue;
  /** Whether the tool execution failed. */
  readonly isError: boolean;
}

/** Ambient data passed to a tool handler on every invocation. */
export interface ToolContext {
  /** Identifier correlating logs and results for a single call. */
  readonly requestId: string;
  /** Tool name being executed. */
  readonly tool: string;
  /** Abort signal that fires when the caller cancels the invocation. */
  readonly signal?: AbortSignal;
}

/** A function that executes a tool. */
export type ToolHandler = (
  args: JsonValue,
  context: ToolContext,
) => ToolOutput | Promise<ToolOutput>;

/** A registered tool and its discoverable metadata. */
export interface ToolDefinition {
  /** Unique identifier used to invoke the tool. */
  readonly name: string;
  /** Human-readable name for display purposes. */
  readonly title?: string;
  /** Human-readable description of what the tool does. */
  readonly description: string;
  /** JSON Schema describing the accepted arguments. */
  readonly inputSchema: JsonSchema;
  /** Optional JSON Schema describing `structuredContent`. */
  readonly outputSchema?: JsonSchema;
  /** Implementation invoked by the executor. */
  readonly handler: ToolHandler;
}

/** A summary of a tool, without its handler, as returned by `listTools`. */
export type ToolInfo = Omit<ToolDefinition, 'handler'>;

/** Options accepted by {@link executeTool}. */
export interface ExecuteOptions {
  /** Override the generated request identifier. */
  readonly requestId?: string;
  /** Abort signal forwarded to the tool handler. */
  readonly signal?: AbortSignal;
}

/** Structured error payload used by tool executors and the CLI. */
export interface ToolkitErrorPayload extends JsonObject {
  readonly code: string;
  readonly message: string;
}
