export default function (api: {}, opts: {}) {
  return {
    parserOpts: {
      plugins: ['jsx'],
    },
    plugins: [
      '@reactive-kit/babel-plugin-reactive-jsx',
      '@reactive-kit/babel-plugin-reactive-functions',
    ],
  };
}
