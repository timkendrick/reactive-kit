import { createRequire } from 'node:module';
import '@types/node/index.d.ts';

const require = createRequire(import.meta.url);

export default function preset(_api: object, _opts: object) {
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
