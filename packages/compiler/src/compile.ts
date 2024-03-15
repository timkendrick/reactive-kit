import { transform } from '@babel/core';
import reactiveFunctions from '@reactive-kit/babel-plugin-reactive-functions';
import { type CompilerOptions } from './types';

const SYNTAX_TYPESCRIPT = ['typescript'] as const;
const SYNTAX_JSX = ['jsx'] as const;

export function compile(source: string, options?: CompilerOptions): string | null {
  const { filename, parser: parserOptions = {} } = options ?? {};
  const result = transform(source, {
    sourceFileName: filename,
    sourceType: parserOptions.sourceType ?? 'module',
    parserOpts: {
      sourceFilename: filename,
      plugins: [
        ...(parserOptions.typescript ? SYNTAX_TYPESCRIPT : []),
        ...(parserOptions.jsx ? SYNTAX_JSX : []),
      ],
    },
    plugins: [reactiveFunctions],
    code: true,
  });
  if (!result) return null;
  return result.code ?? null;
}
