/**
 * @fileoverview Renders tool definitions as human- and model-readable specs.
 */

import type {JsonValue} from '../types/common.js';
import type {JsonSchema, ToolInfo} from '../types/tools.js';

/** Sample values used for well-known parameter names. */
const SAMPLE_VALUES: Readonly<Record<string, JsonValue>> = {
  query: 'nodejs release notes',
  text: 'hello world',
  url: 'https://example.com',
  json: '{"a":1}',
  token: 'eyJhbGciOiJIUzI1NiJ9.e30.sig',
  mode: 'encode',
  algorithm: 'sha256',
  site: 'github.com',
};

/** Optional parameters worth showing in the example payload. */
const EXAMPLE_OPTIONAL_KEYS: readonly string[] = [
  'mode',
  'algorithm',
  'limit',
  'top',
  'count',
];

/**
 * @brief Builds an example argument object from a tool's input schema.
 *
 * Only required properties are included, plus a small set of common optional
 * properties, each with a realistic sample value.
 *
 * @param schema Tool input schema.
 * @return Example payload.
 */
export function exampleFromSchema(schema: JsonSchema): JsonValue {
  if (schema.type !== 'object' || !schema.properties) {
    return {};
  }
  const required = new Set(schema.required ?? []);
  const example: Record<string, JsonValue> = {};
  for (const [key, property] of Object.entries(schema.properties)) {
    const include = required.has(key) || EXAMPLE_OPTIONAL_KEYS.includes(key);
    if (include) {
      example[key] = exampleValue(key, property);
    }
  }
  return example;
}

/**
 * @brief Produces a sample value for one schema property.
 *
 * @param key Property name.
 * @param schema Property schema.
 * @return Sample JSON value.
 */
function exampleValue(key: string, schema: JsonSchema): JsonValue {
  const sample = SAMPLE_VALUES[key];
  const matchesEnum =
    schema.enum === undefined || sample === undefined
      ? true
      : schema.enum.includes(sample);
  if (sample !== undefined && matchesEnum) {
    return sample;
  }
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0] as JsonValue;
  }
  return placeholderForType(schema.type);
}

/**
 * @brief Returns a type-appropriate placeholder value.
 *
 * @param type JSON Schema type name.
 * @return Placeholder JSON value.
 */
function placeholderForType(type: string | undefined): JsonValue {
  switch (type) {
    case 'number':
    case 'integer':
      return 5;
    case 'boolean':
      return true;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return 'string';
  }
}

/**
 * @brief Renders a full spec for one tool.
 *
 * @param tool Tool summary including its schemas.
 * @return Multi-line description with parameters and an example payload.
 */
export function formatToolSpec(tool: ToolInfo): string {
  const lines: string[] = [];
  lines.push(tool.name);
  if (tool.title) {
    lines.push(`  ${tool.title}`);
  }
  lines.push('');
  lines.push(tool.description);
  lines.push('');
  lines.push('Parameters');
  lines.push(...formatParameters(tool.inputSchema));
  lines.push('');
  lines.push('Example arguments');
  lines.push(`  ${JSON.stringify(exampleFromSchema(tool.inputSchema))}`);
  lines.push('');
  lines.push('Example call');
  lines.push(
    `  agent-toolkit run ${tool.name} '${JSON.stringify(exampleFromSchema(tool.inputSchema))}'`,
  );
  if (tool.outputSchema) {
    lines.push('');
    lines.push('Output schema');
    lines.push(`  ${JSON.stringify(tool.outputSchema)}`);
  }
  return lines.join('\n');
}

/**
 * @brief Renders one line per declared parameter.
 *
 * @param schema Tool input schema.
 * @return Formatted parameter lines.
 */
function formatParameters(schema: JsonSchema): string[] {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const entries = Object.entries(properties);
  if (entries.length === 0) {
    return ['  (none)'];
  }
  return entries.map(([key, property]) => {
    const type = property.type ?? 'unknown';
    const marker = required.has(key) ? 'required' : 'optional';
    const choices = property.enum ? ` one of ${property.enum.join('|')}` : '';
    const detail = property.description ? ` - ${property.description}` : '';
    return `  ${key} <${type}> (${marker})${choices}${detail}`;
  });
}
