#!/usr/bin/env node
/**
 * @fileoverview Command-line entry point for the toolkit.
 */

import {createConfig} from './core/config.js';
import {createLogger} from './core/logger.js';
import {defaultTools} from './index.js';
import {createRegistry, executeTool, listTools} from './tools/index.js';
import {formatToolSpec, parseArgv} from './utils/index.js';
import type {ToolInfo} from './types/tools.js';

/** Help text printed for `--help` and on invalid usage. */
export const HELP_TEXT = `agent-toolkit — agent-callable tools

Usage
  agent-toolkit list [tool]          List tools, or describe one tool.
  agent-toolkit describe <tool>      Show parameters and an example payload.
  agent-toolkit run <tool> [json]    Run a tool with JSON arguments.
  agent-toolkit help [tool]          Show help, or describe one tool.

Options
  -h, --help           Show global help, or a tool's spec when named.
  -v, --verbose        Increase log verbosity.

Examples
  agent-toolkit list
  agent-toolkit describe hash
  agent-toolkit run hash '{"text":"abc"}'
`;

/** Exit code returned when usage is invalid. */
export const EXIT_USAGE = 2;

/**
 * @brief Runs the CLI for a given argument list.
 *
 * @param argv Arguments after the executable name, typically
 *   `process.argv.slice(2)`.
 * @return Process exit code: `0` on success, non-zero on failure.
 */
export async function run(argv: readonly string[]): Promise<number> {
  const parsed = parseArgv(argv);
  const verbose =
    parsed.options['verbose'] === true || parsed.flags.includes('v');
  const logger = createLogger(
    createConfig({logLevel: verbose ? 'debug' : 'info'}),
  );
  const registry = createRegistry(defaultTools());
  const tools = listTools(registry);
  const [subject] = parsed.positional;
  const helpOption = parsed.options['help'];
  const wantsHelp = helpOption !== undefined || parsed.flags.includes('h');

  if (wantsHelp) {
    const helpSubject =
      typeof helpOption === 'string' ? helpOption : parsed.command;
    return describeOrHelp(tools, helpSubject);
  }

  switch (parsed.command) {
    case undefined:
    case 'help':
      return describeOrHelp(tools, subject);
    case 'list':
      return describeOrList(tools, subject);
    case 'describe':
      return describeTool(tools, subject, logger);
    case 'run': {
      const [name, rawArgs] = parsed.positional;
      if (!name) {
        logger.error('Missing tool name. Run `agent-toolkit help`.');
        return EXIT_USAGE;
      }
      const args = parseToolArgs(rawArgs, logger);
      const output = await executeTool(registry, name, args);
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
      return output.isError ? 1 : 0;
    }
    default:
      logger.error(`Unknown command: ${parsed.command}`);
      process.stdout.write(HELP_TEXT);
      return EXIT_USAGE;
  }
}

/**
 * @brief Prints a tool spec when one was named, otherwise the global help.
 *
 * @param tools Available tools.
 * @param subject Requested tool name, if any.
 * @return Process exit code.
 */
function describeOrHelp(
  tools: readonly ToolInfo[],
  subject: string | undefined,
): number {
  if (subject === undefined) {
    process.stdout.write(HELP_TEXT);
    return 0;
  }
  const tool = tools.find(candidate => candidate.name === subject);
  if (!tool) {
    process.stderr.write(`Unknown tool: ${subject}\n`);
    return EXIT_USAGE;
  }
  process.stdout.write(`${formatToolSpec(tool)}\n`);
  return 0;
}

/**
 * @brief Prints one tool spec when named, otherwise the tool index.
 *
 * @param tools Available tools.
 * @param subject Requested tool name, if any.
 * @return Process exit code.
 */
function describeOrList(
  tools: readonly ToolInfo[],
  subject: string | undefined,
): number {
  if (subject === undefined) {
    for (const tool of tools) {
      process.stdout.write(`${tool.name}\t${tool.description}\n`);
    }
    return 0;
  }
  return describeTool(tools, subject, {
    error(message: string): void {
      process.stderr.write(`${message}\n`);
    },
  });
}

/**
 * @brief Prints a tool spec, or reports the tool as unknown.
 *
 * @param tools Available tools.
 * @param subject Requested tool name, if any.
 * @param logger Logger used for the error message.
 * @return Process exit code.
 */
function describeTool(
  tools: readonly ToolInfo[],
  subject: string | undefined,
  logger: {error(message: string): void},
): number {
  if (subject === undefined) {
    logger.error('Missing tool name. Run `agent-toolkit list`.');
    return EXIT_USAGE;
  }
  const tool = tools.find(candidate => candidate.name === subject);
  if (!tool) {
    logger.error(`Unknown tool: ${subject}`);
    return EXIT_USAGE;
  }
  process.stdout.write(`${formatToolSpec(tool)}\n`);
  return 0;
}

/**
 * @brief Parses optional JSON arguments supplied on the command line.
 *
 * @param raw Raw argument string, or `undefined` for no arguments.
 * @param logger Logger used to report invalid JSON.
 * @return Parsed JSON value, defaulting to an empty object.
 */
function parseToolArgs(
  raw: string | undefined,
  logger: {warn(message: string): void},
) {
  if (raw === undefined) {
    return {};
  }
  try {
    return JSON.parse(raw) as import('./types/common.js').JsonValue;
  } catch {
    logger.warn('Arguments are not valid JSON; passing an empty object.');
    return {};
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  process.argv[1].replace(/\\/g, '/').endsWith('/cli.js');

if (invokedDirectly) {
  run(process.argv.slice(2))
    .then(code => {
      process.exitCode = code;
    })
    .catch(error => {
      process.stderr.write(`${String(error)}\n`);
      process.exitCode = 1;
    });
}
