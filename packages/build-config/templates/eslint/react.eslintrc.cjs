const base = require('./base.eslintrc.cjs');

module.exports = {
  ...base,
  extends: [
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    ...base.extends,
  ],
  rules: {
    ...base.rules,
    'react/self-closing-comp': [
      'error',
      {
        component: true,
        html: true,
      },
    ],
  },
};
