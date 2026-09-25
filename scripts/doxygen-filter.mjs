#!/usr/bin/env node
/**
 * @fileoverview Doxygen input filter that turns TypeScript into JavaScript.
 *
 * Doxygen has no TypeScript parser, so `Doxyfile` maps `.ts` to the JavaScript
 * parser and pipes each file through this filter. The filter removes
 * TypeScript-only syntax that the JavaScript parser cannot read and keeps the
 * Doxygen comment blocks intact.
 *
 * Usage: doxygen calls it as `node scripts/doxygen-filter.mjs <file>`.
 */

import {readFileSync} from 'node:fs';

/**
 * @brief Reads a file path from the argument list.
 *
 * @return The input path, or an empty string when missing.
 */
function readInputPath() {
  return process.argv[2] ?? '';
}

/**
 * @brief Removes TypeScript-only syntax from a source file.
 *
 * @param source TypeScript source text.
 * @return JavaScript-compatible source text.
 */
function stripTypeScript(source) {
  let text = source;
  text = text.replace(/^\s*import\s+type\b[^;]*;?\s*$/gm, '');
  text = text.replace(/\bimport\s*\{([^}]*)\}\s*from/g, (match, names) => {
    const cleaned = names
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .filter(part => !/^type\s/.test(part));
    return cleaned.length ? `import {${cleaned.join(', ')}} from` : 'import {} from';
  });
  text = text.replace(/\bas\s+const\b/g, '');
  text = text.replace(/\bexport\s+type\b/g, 'export');
  text = text.replace(/\bexport\s+interface\s+(\w+)[^{]*\{/g, 'export class $1 {');
  text = text.replace(/^\s*interface\s+(\w+)[^{]*\{/gm, 'class $1 {');
  text = text.replace(/\btype\s+(\w+)(<[^>]*>)?\s*=[^;]*;/g, '');
  text = text.replace(/\)\s*:\s*[^{;=]+(\{|=>)/g, ') $1');
  text = text.replace(/(\w)\s*:\s*[A-Za-z_][\w.<>\[\]|,'" ]*(?=[,)=;])/g, '$1');
  text = text.replace(/\breadonly\s+/g, '');
  text = text.replace(/\bpublic\s+|private\s+|protected\s+/g, '');
  text = text.replace(/([,(]\s*)\w+\s*\??\s*:/g, '$1');
  return text;
}

const inputPath = readInputPath();
if (!inputPath) {
  process.stdout.write('');
  process.exit(0);
}
const source = readFileSync(inputPath, 'utf8');
process.stdout.write(stripTypeScript(source));
