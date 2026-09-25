/**
 * @fileoverview ESLint configuration for the toolkit.
 */

import gts from 'gts';

export default [
  {ignores: ['dist/', 'node_modules/', 'docs/api/', 'docs/api/**']},
  ...gts,
];
