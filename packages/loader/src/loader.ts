import type {
  LoaderContext,
  LoaderNext,
  LoaderResult,
  ResolverContext,
  ResolverNext,
  ResolverResult,
} from './types';
import { compile } from '@reactive-kit/compiler';

export function resolve(
  specifier: string,
  context: ResolverContext,
  next: ResolverNext,
): Promise<ResolverResult> {
  return Promise.resolve(next(specifier, context)).then((result) => {
    if (!result.format && isJsxImportSpecifier(specifier)) {
      return {
        ...result,
        format: 'module',
      };
    }
    return result;
  });
}

export function load(url: string, context: LoaderContext, next: LoaderNext): Promise<LoaderResult> {
  return Promise.resolve(next(url, context)).then((result) => {
    if (result.source == null) return result;
    switch (result.format) {
      case 'commonjs':
        return transpileLoaderResult(result, {
          url,
          sourceType: 'script',
          jsx: isJsxImportSpecifier(url),
        });
      case 'module':
        return transpileLoaderResult(result, {
          url,
          sourceType: 'module',
          jsx: isJsxImportSpecifier(url),
        });
      case 'builtin':
      case 'json':
      case 'wasm':
      default:
        return result;
    }
  });
}

function isJsxImportSpecifier(specifier: string): boolean {
  if (specifier.endsWith('.jsx')) return true;
  if (specifier.endsWith('.tsx')) return true;
  return false;
}

function transpileLoaderResult(
  result: LoaderResult,
  options: { url: string; sourceType: 'script' | 'module'; jsx: boolean },
) {
  const { url, sourceType, jsx } = options;
  return {
    ...result,
    source:
      compile(parseUtf8(result.source), {
        filename: url,
        parser: {
          sourceType,
          jsx,
        },
        sourcemap: true,
      }) ?? result.source,
  };
}

function parseUtf8(source: string | ArrayBuffer | NodeJS.TypedArray): string {
  if (typeof source === 'string') {
    return source;
  } else {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(source);
  }
}
