module.exports = {
  root: true,
  plugins: ['@typescript-eslint', 'prettier'],
  extends: ['@nuxt/eslint-config', 'prettier'],
  rules: {
    semi: [2, 'always'],
    'space-before-function-paren': ['error', 'never']
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
