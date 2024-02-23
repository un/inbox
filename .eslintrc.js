module.exports = {
  root: true,
  plugins: ['prettier'],
  extends: ['@nuxt/eslint-config', 'prettier'],
  rules: {
    semi: [2, 'always']
  },
  overrides: [
    {
      files: ['*/server/**/*.ts'],
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
