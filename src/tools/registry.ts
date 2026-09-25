/**
 * @fileoverview In-memory registry of tools available to an agent.
 */

import {ToolkitError} from '../core/errors.js';
import type {ToolDefinition, ToolInfo} from '../types/tools.js';

/** A lookup table of tools keyed by their unique name. */
export type ToolRegistry = ReadonlyMap<string, ToolDefinition>;

/**
 * @brief Registers a tool in a new registry.
 *
 * @param tools Tools to register; names must be unique within the list.
 * @return An immutable registry keyed by tool name.
 * @throws ToolkitError When two tools share the same name, or a name is empty.
 */
export function createRegistry(
  tools: readonly ToolDefinition[] = [],
): ToolRegistry {
  const registry = new Map<string, ToolDefinition>();
  for (const tool of tools) {
    if (!tool.name) {
      throw new ToolkitError('INVALID_TOOL', 'Tool name must not be empty');
    }
    if (registry.has(tool.name)) {
      throw new ToolkitError(
        'DUPLICATE_TOOL',
        `Tool already registered: ${tool.name}`,
      );
    }
    registry.set(tool.name, tool);
  }
  return registry;
}

/**
 * @brief Looks up a tool by name.
 *
 * @param registry Registry to query.
 * @param name Tool name to resolve.
 * @return The matching tool definition.
 * @throws ToolkitError When no tool with `name` exists.
 */
export function getTool(registry: ToolRegistry, name: string): ToolDefinition {
  const tool = registry.get(name);
  if (!tool) {
    throw new ToolkitError('UNKNOWN_TOOL', `Unknown tool: ${name}`);
  }
  return tool;
}

/**
 * @brief Lists tool metadata without exposing handlers.
 *
 * @param registry Registry to enumerate.
 * @return Tool summaries ordered by registration order.
 */
export function listTools(registry: ToolRegistry): ToolInfo[] {
  return [...registry.values()].map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    ...(tool.title === undefined ? {} : {title: tool.title}),
    ...(tool.outputSchema === undefined
      ? {}
      : {outputSchema: tool.outputSchema}),
  }));
}
