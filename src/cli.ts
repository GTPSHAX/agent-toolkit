#!/usr/bin/env node
/**
 * @fileoverview Command-line entry point for the toolkit.
 */

import {createConfig} from './core/config.js';
import {createLogger} from './core/logger.js';
import {defaultTools} from './index.js';
import {createRegistry, executeTool, listTools} from './tools/index.js';
import {parseArgv} from './utils/index.js';

/** Help text printed for `--help` and on invalid usage. */
export const HELP_TEXT = `agent-toolkit — agent-callable tools

Usage
  agent-toolkit <command> [options]

Commands
  list                 List the available tools.
  run <tool> [json]    Run a tool with optional JSON arguments.
  help                 Show this help message.

Options
  -h, --help           Show this help message.
  -v, --verbose        Increase log verbosity.
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

  switch (parsed.command) {
    case undefined:
    case 'help':
      process.stdout.write(HELP_TEXT);
      return 0;
    case 'list':
      for (const tool of listTools(registry)) {
        process.stdout.write(`${tool.name}\t${tool.description}\n`);
      }
      return 0;
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
