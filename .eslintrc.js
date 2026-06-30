/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  // Each app/package extends this root config.
  // Apps add `plugin:@next/eslint-plugin-next/recommended` via their own eslint configs.
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    // Allow explicit any only as a last resort — prefer `unknown`
    '@typescript-eslint/no-explicit-any': 'warn',
    // Unused vars should be errors except for leading underscore convention
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // Consistent type imports
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'dist/',
    'out/',
    '*.config.js',
    '*.config.cjs',
    '*.config.mjs',
  ],
};
