import { describe, expect, test } from 'vitest';
import { printAst, transform, template } from '@reactive-kit/babel-test-utils';

import { hoistAsyncFunctions } from './hoistAsyncFunctions';

describe(hoistAsyncFunctions, () => {
  test('leaves top-level async functions in place', () => {
    const input = template.program.ast/* javascript */ `
      async function foo(bar, baz) {
        return 'Hello, world!';
      }
    `;
    const expected = template.program.ast/* javascript */ `
      async function foo(bar, baz) {
        return 'Hello, world!';
      }
    `;
    const actual = transform(printAst(input), {
      plugins: [hoistAsyncFunctions],
      code: true,
    });
    expect(actual?.code).toBe(printAst(expected));
  });

  test('hoists nested async functions to renamed top-level functions', () => {
    const input = template.program.ast/* javascript */ `
      function outer() {
        function inner() {
          async function foo(bar, baz) {
            return 'Hello, world!';
          }
        }
      }
    `;
    const expected = template.program.ast/* javascript */ `
      async function _foo(bar, baz) {
        return 'Hello, world!';
      }

      function outer() {
        function inner() {
          function foo(bar, baz) {
            return _foo(bar, baz);
          }
        }
      }
    `;
    const actual = transform(printAst(input), {
      plugins: [hoistAsyncFunctions],
      code: true,
    });
    expect(actual?.code).toBe(printAst(expected));
  });

  test('prevents naming collisions between renamed top-level functions', () => {
    const input = template.program.ast/* javascript */ `
      function outer() {
        function innerA() {
          async function foo(bar, baz) {
            return 'Hello, world!';
          }
        }
        function innerB() {
          async function foo(bar, baz) {
            return 'Goodbye, world!';
          }
        }
      }
    `;
    const expected = template.program.ast/* javascript */ ` 
      async function _foo2(bar, baz) {
        return 'Goodbye, world!';
      }

      async function _foo(bar, baz) {
        return 'Hello, world!';
      }

      function outer() {
        function innerA() {
          function foo(bar, baz) {
            return _foo(bar, baz);
          }
        }
        function innerB() {
          function foo(bar, baz) {
            return _foo2(bar, baz);
          }
        }
      }
    `;
    const actual = transform(printAst(input), {
      plugins: [hoistAsyncFunctions],
      code: true,
    });
    expect(actual?.code).toBe(printAst(expected));
  });

  test('extracts free variables as function arguments', () => {
    const input = template.program.ast/* javascript */ `
      function outer() {
        function inner() {
          const greeting = 'Hello';
          const user = 'world';
          async function foo(bar, baz) {
            const qux = 'local';
            return greeting + ', ' + user + '!';
          }
        }
      }
    `;
    const expected = template.program.ast/* javascript */ `
      async function _foo(greeting, user, bar, baz) {
        const qux = 'local';
        return greeting + ', ' + user + '!';
      }

      function outer() {
        function inner() {
          const greeting = 'Hello';
          const user = 'world';
          function foo(bar, baz) {
            return _foo(greeting, user, bar, baz);
          }
        }
      }
    `;
    const actual = transform(printAst(input), {
      plugins: [hoistAsyncFunctions],
      code: true,
    });
    expect(actual?.code).toBe(printAst(expected));
  });

  test('renames pattern arguments', () => {
    const input = template.program.ast/* javascript */ `
      function outer() {
        function inner() {
          const greeting = 'Hello';
          const user = 'world';
          async function foo({ bar }, [baz], qux = 3, ...rest) {
            return greeting + ', ' + user + '!';
          }
        }
      }
    `;
    const expected = template.program.ast/* javascript */ `
      async function _foo(greeting, user, { bar }, [baz], qux = 3, ...rest) {
        return greeting + ', ' + user + '!';
      }

      function outer() {
        function inner() {
          const greeting = 'Hello';
          const user = 'world';
          function foo(_bar, _ref, _ref2, ...rest) {
            return _foo(greeting, user, _bar, _ref, _ref2, ...rest);
          }
        }
      }
    `;
    const actual = transform(printAst(input), {
      plugins: [hoistAsyncFunctions],
      code: true,
    });
    expect(actual?.code).toBe(printAst(expected));
  });
});
