export interface CompilerOptions {
  filename: string;
  parser?: ParserOptions;
}

export interface ParserOptions {
  sourceType?: 'module' | 'script';
  typescript?: boolean;
  jsx?: boolean;
}
