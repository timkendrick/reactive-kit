const base = require('@reactive-kit/build-config/templates/eslint/lib.eslintrc.cjs');

module.exports = {
  ...base,
  parserOptions: {
    ...base.parserOptions,
    tsconfigRootDir: __dirname,
  },
};
