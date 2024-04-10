export interface CompilerOptions {
  filename: string;
  parser?: ParserOptions;
  sourcemap?: boolean;
}

export interface ParserOptions {
  sourceType?: 'module' | 'script';
  typescript?: boolean;
  jsx?: boolean;
}
