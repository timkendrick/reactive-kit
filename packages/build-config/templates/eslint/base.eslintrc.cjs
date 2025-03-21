const { rules } = require('./rules.eslintrc.cjs');

module.exports = {
  root: true,
  env: {
    es2022: true,
  },
  extends: ['plugin:vitest/recommended', 'plugin:prettier/recommended'],
  plugins: ['@typescript-eslint', 'vitest', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  overrides: [
    {
      files: ['.eslintrc.cjs'],
      env: {
        node: true,
      },
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
  rules,
};
