/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier', 'drizzle', '@u22n/custom'],
  extends: ['prettier', 'plugin:drizzle/all'],
  rules: {
    semi: [2, 'always']
  },
  overrides: [
    {
      files: ['*'],
      rules: {
        'no-console': [
          'error',
          {
            allow: ['info', 'warn', 'trace', 'error']
          }
        ]
      }
    },
    {
      files: ['./packages/database/**/*'],
      rules: {
        '@u22n/custom/table-needs-org-id': 'error'
      }
    }
  ]
};
