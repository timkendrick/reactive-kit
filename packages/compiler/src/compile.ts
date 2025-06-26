import { transformSync, type TransformOptions } from '@babel/core';

import plugins from './plugins';
import type { CompilerOptions } from './types';

const SYNTAX_TYPESCRIPT = ['typescript'] as const;
const SYNTAX_JSX = ['jsx'] as const;

export function compile(source: string, options?: CompilerOptions): string | null {
  const { filename, parser: parserOptions = {}, sourcemap } = options ?? {};
  const result = transformSync(source, {
    sourceFileName: filename,
    sourceType: parserOptions.sourceType ?? 'module',
    parserOpts: {
      sourceFilename: filename,
      plugins: [
        ...(parserOptions.typescript ? SYNTAX_TYPESCRIPT : []),
        ...(parserOptions.jsx ? SYNTAX_JSX : []),
      ],
    },
    plugins,
    code: true,
    ...(sourcemap
      ? {
          inputSourceMap: true as unknown as TransformOptions['inputSourceMap'],
          sourceMaps: 'inline',
        }
      : undefined),
  });
  if (!result) return null;
  return result.code ?? null;
}
