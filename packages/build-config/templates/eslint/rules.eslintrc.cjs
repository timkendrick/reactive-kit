module.exports = {
  rules: {
    'no-constant-condition': [
      'error',
      {
        checkLoops: false,
      },
    ],
    'no-empty-pattern': 'off',
    'no-warning-comments': [
      'warn',
      {
        terms: ['fixme'],
      },
    ],
    'import/first': 'error',
    'import/order': [
      'error',
      {
        alphabetize: { order: 'asc' },
        pathGroups: [
          {
            pattern: 'vitest',
            group: 'external',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        named: { import: true, types: 'types-last' },
        'newlines-between': 'always',
      },
    ],
    'import/no-duplicates': ['error', { 'prefer-inline': true }],
    'prettier/prettier': 'error',
    'vitest/valid-title': [
      'error',
      {
        allowArguments: true,
      },
    ],
    '@typescript-eslint/array-type': [
      'error',
      {
        default: 'generic',
      },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports',
      },
    ],
  },
};
