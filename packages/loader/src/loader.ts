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
  return Promise.resolve(next(specifier, context));
}

export function load(url: string, context: LoaderContext, next: LoaderNext): Promise<LoaderResult> {
  return Promise.resolve(next(url, context)).then((result) => {
    if (result.source == null) return result;
    switch (result.format) {
      case 'commonjs':
        return transpileLoaderResult(result, { url, sourceType: 'script' });
      case 'module':
        return transpileLoaderResult(result, { url, sourceType: 'module' });
      case 'builtin':
      case 'json':
      case 'wasm':
      default:
        return result;
    }
  });
}

function transpileLoaderResult(
  result: LoaderResult,
  options: { url: string; sourceType: 'script' | 'module' },
) {
  const { url, sourceType } = options;
  return {
    ...result,
    source:
      compile(parseUtf8(result.source), {
        filename: url,
        parser: {
          sourceType,
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
