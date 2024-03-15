import { describe, expect, test } from 'vitest';
import {
  printAst,
  transform,
  template,
  types as t,
  TemplateBuilderOptions,
} from '@reactive-kit/babel-test-utils';
import { hashAstNode } from '../utils/ast';

import { reactiveFunctions } from './reactiveFunctions';

describe(reactiveFunctions, () => {
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
    const actual = transform(printAst(input), {
      plugins: [reactiveFunctions],
      code: true,
    });
    expect(actual?.code).toBe(printAst(expected));
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
    const actual = transform(printAst(input), {
      parserOpts: {
        plugins: ['typescript'],
      },
      plugins: [reactiveFunctions],
      code: true,
    });
    expect(actual?.code).toBe(printAst(expected));
  });

  test('transforms unknown TypeScript return types', () => {
    const input = template.program({ plugins: ['typescript'] } as TemplateBuilderOptions)
      .ast/* typescript */ `
        async function foo(bar: string, baz: string): CustomPromise<string> {
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
            [Symbol.for("@reactive-kit/symbols/stateful")]: function* foo(): IteratorResult<any, CustomPromise<string> extends Promise<infer $T> ? $T : any> {
              const x: number = 1;
              const y = x + (yield useFirst());
              const z = y + (yield useSecond());
              return \`Result: \${z}\`;
            }
          };
        }
    `;
    const actual = transform(printAst(input), {
      parserOpts: {
        plugins: ['typescript'],
      },
      plugins: [reactiveFunctions],
      code: true,
    });
    expect(actual?.code).toBe(printAst(expected));
  });
});
