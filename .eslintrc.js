/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'drizzle'],
  parserOptions: {
    project: true
  },
  extends: [
    'plugin:drizzle/all',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked'
  ],
  rules: {
    '@typescript-eslint/array-type': 'off',
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
    ],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: { attributes: false } }
    ],
    'no-console': ['error', { allow: ['info', 'warn', 'trace', 'error'] }]
  },
  overrides: [
    {
      files: ['./packages/database/**/*'],
      plugins: ['@u22n/custom'],
      rules: { '@u22n/custom/table-needs-org-id': 'error' }
    },
    {
      files: ['./apps/web/**/*'],
      extends: ['next/core-web-vitals'],
      rules: { 'react/no-children-prop': ['warn', { allowFunctions: true }] }
    }
  ]
};
