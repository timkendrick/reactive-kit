import transform from '@reactive-kit/babel-plugin-reactive-functions';
import { type BabelPlugin } from '@reactive-kit/babel-types';
import { type CompilerOptions } from './types';
import { applyBabelTransform, type Parser } from './utils/babel';

const SYNTAX_TYPESCRIPT: Array<Parser.ParserPlugin> = ['typescript'];
const SYNTAX_JSX: Array<Parser.ParserPlugin> = ['jsx'];

export function compile(source: string, options?: CompilerOptions): string | null {
  const plugins: Array<BabelPlugin> = [transform];
  return applyBabelTransform(source, plugins, {
    filename: options?.filename ?? 'unknown',
    parser: {
      plugins: [
        ...(options?.parser?.typescript ? SYNTAX_TYPESCRIPT : []),
        ...(options?.parser?.jsx ? SYNTAX_JSX : []),
      ],
    },
    printer: options?.printer,
  });
}
