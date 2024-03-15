import { transformFromAstSync, type BabelFileResult, type TransformOptions } from '@babel/core';
import { parse as parseAst, type ParseResult, type ParserOptions } from '@babel/parser';
import { type File, type Node } from '@babel/types';
import traverseAst, { type Visitor } from '@babel/traverse';
import { type BabelPlugin, type BabelPluginWithOptions } from '@reactive-kit/babel-types';
import { parse, print, type Options as RecastOptions } from 'recast';

export type * as Parser from '@babel/parser';
export type * as Traverse from '@babel/traverse';

export interface BabelTransformPluginOptions {
  filename: string;
  parser?: Omit<ParserOptions, 'sourceFilename'>;
  transform?: Omit<BabelAstTransformOptions, 'filename'>;
  printer?: RecastOptions;
}

export interface BabelAstTransformOptions
  extends Omit<TransformOptions, 'code' | 'ast' | 'cloneInputAst' | 'plugins'> {}

export function createBabelPlugin<S>(plugin: BabelPlugin<S>): BabelPlugin<S> {
  // No-op function that exists to provide type hints when create a Babel plugin from untyped code
  return plugin;
}

export function applyBabelTransform<S, T extends object = object>(
  source: string,
  plugins: Array<BabelPlugin<S> | BabelPluginWithOptions<S, T>>,
  options: BabelTransformPluginOptions,
): string | null {
  const {
    filename,
    parser: parserOptions,
    printer: printerOptions,
    transform: transformOptions,
  } = options;
  // Attempt to determine input file line endings, defaulting to the operating system default
  const crlfLineEndings = source.includes('\r\n');
  const lfLineEndings = !crlfLineEndings && source.includes('\n');
  const lineTerminator = crlfLineEndings ? '\r\n' : lfLineEndings ? '\n' : undefined;
  // Parse the source AST
  const ast = parseBabelAst(source, {
    sourceFilename: filename,
    ...parserOptions,
  });
  // Transform the AST
  const transformedAst = transformBabelAst(ast, plugins, {
    source,
    filename,
    ...transformOptions,
  });
  // Print the transformed AST
  const transformedSource = transformedAst
    ? printBabelAst(transformedAst, {
        lineTerminator,
        ...printerOptions,
      })
    : null;
  return transformedSource;
}

function printBabelAst(ast: File, printerOptions?: RecastOptions | undefined) {
  return print(ast, printerOptions).code;
}

export function parseBabelAst<S, T extends object = object>(
  source: string,
  options?: Omit<ParserOptions, 'tokens'>,
): ParseResult<File> {
  const { sourceFilename, ...parserOptions } = options ?? {};
  return parse(source, {
    parser: {
      sourceFilename,
      parse(source: string): ReturnType<typeof parseAst> {
        const { plugins } = parserOptions;
        return parseAst(source, {
          sourceFilename,
          ...parserOptions,
          tokens: true,
        });
      },
    },
  }) as ReturnType<typeof parseAst>;
}

export function transformBabelAst<S, T extends object = object>(
  node: Node,
  plugins: Array<BabelPlugin<S> | BabelPluginWithOptions<S, T>>,
  options?: BabelAstTransformOptions & {
    source?: string;
  },
): File | null {
  const { source, ...transformOptions } = options ?? {};
  const { filename } = transformOptions;
  const result = stripBabelTransformErrorFilenamePrefix(() =>
    transformFromAstSync(node, source || undefined, {
      ...transformOptions,
      code: false,
      ast: true,
      cloneInputAst: false, // See https://github.com/benjamn/recast#using-a-different-parser
      plugins,
      filename,
    }),
  );
  if (!result) return null;
  return result.ast || null;
}

export function traverse(ast: Node, visitor: Visitor): void {
  return traverseAst(ast, visitor);
}

function stripBabelTransformErrorFilenamePrefix(fn: () => BabelFileResult | null) {
  try {
    return fn();
  } catch (error) {
    // Revert the error message to strip the filename prefix inserted by Babel
    // See https://github.com/babel/babel/commit/298c9a6c3304cdf48b0a57f6787d9956d9548e95#diff-bd8fa6037ad52f62e924aaab99b489a136bad15b46e79cc285be2e124c8b4e7b
    if (
      error instanceof Error &&
      (error as Error & { code?: string }).code === 'BABEL_TRANSFORM_ERROR'
    ) {
      const errorMessage = error.message;
      const filenamePrefixSeparator = ': ';
      const filenamePrefixLength = errorMessage.indexOf(filenamePrefixSeparator);
      if (filenamePrefixLength !== -1) {
        error.message = error.message.slice(filenamePrefixLength + filenamePrefixSeparator.length);
      }
    }
    throw error;
  }
}
