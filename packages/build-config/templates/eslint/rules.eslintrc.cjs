module.exports = {
  rules: {
    'no-warning-comments': [
      'warn',
      {
        terms: ['fixme'],
      },
    ],
    'prettier/prettier': 'error',
    'vitest/valid-title': [
      'error',
      {
        allowArguments: true,
      },
    ],
  },
};
