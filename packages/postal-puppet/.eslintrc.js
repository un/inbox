module.exports = {
  root: true,
  plugins: ['@typescript-eslint', 'prettier'],
  extends: ['@nuxt/eslint-config', 'prettier', '@unocss'],
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
