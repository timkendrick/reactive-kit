module.exports = {
  rules: {
    'no-console': 'error',
    'no-constant-condition': [
      'error',
      {
        checkLoops: false,
      },
    ],
    'no-empty-pattern': 'off',
    'no-useless-catch': 'off',
    'no-useless-rename': 'error',
    'no-warning-comments': [
      'warn',
      {
        terms: ['fixme'],
      },
    ],
    'object-shorthand': ['error', 'always'],
    '@typescript-eslint/array-type': [
      'error',
      {
        default: 'generic',
      },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports',
      },
    ],
    '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'always' }],
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
  },
};
