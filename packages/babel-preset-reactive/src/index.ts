import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default function (api: {}, opts: {}) {
  return {
    parserOpts: {
      plugins: ['jsx'],
    },
    plugins: [
      require.resolve('@reactive-kit/babel-plugin-reactive-jsx'),
      require.resolve('@reactive-kit/babel-plugin-reactive-functions'),
    ],
  };
}
