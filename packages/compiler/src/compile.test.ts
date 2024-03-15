import { describe, expect, test } from 'vitest';

import { compile } from './compile';
import { CompilerOptions } from './types';

describe(compile, () => {
  test('transforms typescript source', () => {
    const input = /* typescript */ `
      async function foo(bar: string, baz: string): Promise<string> {
        const x: number = 1;
        const y = x + await useFirst();
        const z = y + await useSecond();
        return \`Result: \${z}\`;
      }
    `;
    const expected = /* typescript */ `
      function* foo(bar: string, baz: string): IteratorResult<any, string> {
        const x: number = 1;
        const y = x + (yield useFirst());
        const z = y + (yield useSecond());
        return \`Result: \${z}\`;
      }
    `;
    const options: CompilerOptions = {
      filename: 'test.ts',
      parser: {
        typescript: true,
      },
    };
    const actual = compile(input, options);
    expect(actual).toBe(expected);
  });
});
