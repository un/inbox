module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier', 'drizzle'],
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
    }
  ]
};
