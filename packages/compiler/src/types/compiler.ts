export interface CompilerOptions {
  filename: string;
  parser?: ParserOptions;
  printer?: PrinterOptions;
}

export interface ParserOptions {
  sourceType?: 'module' | 'script';
  typescript?: boolean;
  jsx?: boolean;
}

export interface PrinterOptions {}
