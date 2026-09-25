/**
 * @fileoverview Copies hand-written declaration files from `src/types` into
 * `dist/types`.
 */

import {cpSync, existsSync} from 'node:fs';
import {join} from 'node:path';

const sourceDir = join(process.cwd(), 'src', 'types');
const targetDir = join(process.cwd(), 'dist', 'types');

if (!existsSync(sourceDir)) {
  process.stdout.write('copy-types: no src/types directory, nothing to copy\n');
  process.exit(0);
}

cpSync(sourceDir, targetDir, {recursive: true});
process.stdout.write(`copy-types: copied ${sourceDir} -> ${targetDir}\n`);
