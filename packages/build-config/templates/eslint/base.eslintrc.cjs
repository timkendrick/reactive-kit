const { rules } = require('./rules.eslintrc.cjs');

module.exports = {
  root: true,
  env: {
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vitest/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['@typescript-eslint', 'import', 'prettier', 'vitest'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
      node: true,
    },
  },
  overrides: [
    {
      files: ['*.mjs'],
      env: {
        node: true,
      },
      parserOptions: {
        sourceType: 'module',
      },
    },
    {
      files: ['*.cjs'],
      env: {
        node: true,
      },
      parserOptions: {
        sourceType: 'script',
      },
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  rules,
};
