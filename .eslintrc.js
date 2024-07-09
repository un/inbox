module.exports = {
  root: true,
  plugins: ['prettier', 'drizzle'],
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
