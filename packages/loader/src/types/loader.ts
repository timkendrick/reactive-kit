export interface Resolver {
  (
    specifier: string,
    context: ResolverContext,
    next: ResolverNext,
  ): ResolverResult | Promise<ResolverResult>;
}

export interface ResolverContext {
  conditions: Array<string>;
  importAttributes: Record<string, string>;
  parentURL: string;
}

export interface ResolverNext {
  (specifier: string, context: ResolverContext): ResolverResult | Promise<ResolverResult>;
}

export interface ResolverResult {
  format?: 'builtin' | 'commonjs' | 'json' | 'module' | 'wasm' | string | null;
  importAttributes?: Record<string, string>;
  shortCircuit?: boolean;
  url: string;
}

export interface LoaderContext {
  conditions: Array<string>;
  format: string | null | undefined;
  importAttributes: Record<string, string>;
}

export interface LoaderNext {
  (specifier: string, context: LoaderContext): LoaderResult | Promise<LoaderResult>;
}

export interface LoaderResult {
  format: 'builtin' | 'commonjs' | 'json' | 'module' | 'wasm';
  shortCircuit?: boolean;
  source: string | ArrayBuffer | TypedArray;
}

export type TypedArray =
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | BigUint64Array
  | BigInt64Array
  | Float32Array
  | Float64Array;
