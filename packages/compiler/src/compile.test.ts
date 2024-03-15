import {
  printAst,
  transform,
  template,
  types as t,
  TemplateBuilderOptions,
} from '@reactive-kit/babel-test-utils';
import { hashAstNode } from '@reactive-kit/babel-plugin-reactive-functions/src/utils/ast';
import { describe, expect, test } from 'vitest';

import { compile } from './compile';
import { CompilerOptions } from './types';

describe(compile, () => {
  test('transforms JavaScript source', () => {
    const input = template.program.ast/* javascript */ `
      async function foo(bar, baz) {
        const x = 1;
        const y = x + await useFirst();
        const z = y + await useSecond();
        return \`Result: \${z}\`;
      }
    `;
    const inputHash = t.bigIntLiteral(String(hashAstNode(input.body[0])));
    const expected = template.program.ast/* javascript */ `
      function foo(bar, baz) {
        return {
          [Symbol.for("@reactive-kit/symbols/hash")]: (_hash) => _hash(${inputHash}, bar, baz),
          [Symbol.for("@reactive-kit/symbols/stateful")]: function* foo() {
            const x = 1;
            const y = x + (yield useFirst());
            const z = y + (yield useSecond());
            return \`Result: \${z}\`;
          },
        };
      }
    `;
    const options: CompilerOptions = {
      filename: 'test.js',
    };
    const actual = compile(printAst(input), options);
    expect(actual).toBe(printAst(expected));
  });

  test('transforms TypeScript source', () => {
    const input = template.program({ plugins: ['typescript'] } as TemplateBuilderOptions)
      .ast/* typescript */ `
        async function foo(bar: string, baz: string): Promise<string> {
          const x: number = 1;
          const y = x + await useFirst();
          const z = y + await useSecond();
          return \`Result: \${z}\`;
        }
      `;
    const inputHash = t.bigIntLiteral(String(hashAstNode(input.body[0])));
    const expected = template.program({ plugins: ['typescript'] } as TemplateBuilderOptions)
      .ast/* typescript */ `
        function foo(bar: string, baz: string) {
          return {
            [Symbol.for("@reactive-kit/symbols/hash")]: (_hash) => _hash(${inputHash}, bar, baz),
            [Symbol.for("@reactive-kit/symbols/stateful")]: function* foo(): IteratorResult<any, string> {
              const x: number = 1;
              const y = x + (yield useFirst());
              const z = y + (yield useSecond());
              return \`Result: \${z}\`;
            },
          };
        }
      `;
    const options: CompilerOptions = {
      filename: 'test.ts',
      parser: {
        typescript: true,
      },
    };
    const actual = compile(printAst(input), options);
    expect(actual).toBe(printAst(expected));
  });
});
