import { describe, expect, test } from 'vitest';

import { printAst, template, transform, types as t } from '@reactive-kit/babel-test-utils';

import { reactiveJsx } from './reactiveJsx';

describe(reactiveJsx, () => {
  describe('transforms JSX source', () => {
    test('basic JSX elements', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return <main id="foo">Hello, world!</main>;
          }
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return {
              "type": "main",
              "props": {
                "id": "foo",
                "children": "Hello, world!",
              },
            };
          }
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });

    test('custom elements', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return (
              <main id="foo">
                <Header id="bar">Hello, world!</Header>
              </main>
            );
          }

          async function Header(props) {
            const { children } = props;
            return <h1>{children}</h1>;
          }
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return {
              "type": "main",
              "props": {
                "id": "foo",
                "children": await Header({
                  "id": "bar",
                  "children": "Hello, world!",
                }),
              },
            };
          }

          async function Header(props) {
            const { children } = props;
            return {
              "type": "h1",
              "props": {
                "children": children,
              },
            }
          }
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });

    test('namespaced custom elements', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          import * as foo from './foo';

          async function Main(props) {
            return (
              <main id="foo">
                <foo.bar.Header id="bar">Hello, world!</foo.bar.Header>
              </main>
            );
          }
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          import * as foo from './foo';

          async function Main(props) {
            return {
              "type": "main",
              "props": {
                "id": "foo",
                "children": await foo.bar.Header({
                  "id": "bar",
                  "children": "Hello, world!",
                }),
              },
            };
          }
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });

    test('element keys', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return (
              <main key="foo" id="bar">
                <Header key="baz" id="qux">Hello, world!</Header>
              </main>
            );
          }
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return {
              "type": "main",
              "key": "foo",
              "props": {
                "id": "bar",
                "children": {
                  "key": "baz",
                  ...await Header({
                    "id": "qux",
                    "children": "Hello, world!",
                  }),
                },
              },
            };
          }
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });

    test('element refs', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            const foo = { current: null };
            const baz = { current: null };
            return (
              <main ref={foo} id="bar">
                <Header ref={baz} id="qux">Hello, world!</Header>
              </main>
            );
          }
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            const foo = { current: null };
            const baz = { current: null };
            return {
              "type": "main",
              "ref": foo,
              "props": {
                "id": "bar",
                "children": {
                  "ref": baz,
                  ...await Header({
                    "id": "qux",
                    "children": "Hello, world!",
                  }),
                },
              },
            };
          }
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });

    test('self-closing elements', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return <main id="foo" />;
          }
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return {
              "type": "main",
              "props": {
                "id": "foo"
              },
            };
          }
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });

    test('empty element children', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return <main id="foo"></main>;
          }
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return {
              "type": "main",
              "props": {
                "id": "foo",
                "children": null,
              },
            };
          }
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });

    test('whitespace element children', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return (
              <main id="foo">

              </main>
            );
          }
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return {
              "type": "main",
              "props": {
                "id": "foo",
                "children": null,
              },
            };
          }
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });

    test('multiple element children', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return (
              <ul id="foo">
                <li id="first" />
                <li id="second" />
                <li id="third" />
              </ul>
            );
          }
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return {
              "type": "ul",
              "props": {
                "id": "foo",
                "children": [
                  {
                    "type": "li",
                    "props": {
                      "id": "first",
                    },
                  },
                  ${t.stringLiteral(`
                `)},
                  {
                    "type": "li",
                    "props": {
                      "id": "second",
                    },
                  },
                  ${t.stringLiteral(`
                `)},
                  {
                    "type": "li",
                    "props": {
                      "id": "third",
                    },
                  },
                ],
              },
            };
          }
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });

    test('spread JSX attributes', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return <main id="foo" {...props}>Hello, world!</main>;
          }
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            return {
              "type": "main",
              "props": {
                "id": "foo",
                ...props,
                "children": "Hello, world!",
              },
            };
          }
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });

    test('spread JSX children', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            const { children } = props;
            return <main id="foo">{...children}</main>;
          }
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            const { children } = props;
            return {
              "type": "main",
              "props": {
                "id": "foo",
                "children": children,
              },
            };
          }
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });

    test('interpolated spread JSX children', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            const { children } = props;
            return <main id="foo">Hello, {...children} World!</main>;
          }
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          async function Main(props) {
            const { children } = props;
            return {
              "type": "main",
              "props": {
                "id": "foo",
                "children": [
                  "Hello, ",
                  ...children,
                  " World!",
                ],
              },
            };
          }
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });

    test('top-level JSX intrinsic elements', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          <main id="foo" />
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          ({
            "type": "main",
            "props": {
              "id": "foo",
            },
          })
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });

    test('top-level JSX custom elements', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          <Main id="foo" />
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          Main({ "id": "foo" })
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });

    test('JSX custom elements in non-async functions', () => {
      const input = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          function foo() {
            return <Main id="foo" />;
          }
          async function bar() {
            return (() => <Main id="bar" />)();
          }
        `;
      const expected = template.program({
        plugins: ['jsx'],
      }).ast /* javascript */ `
          function foo() {
            return Main({ "id": "foo" });
          }
          async function bar() {
            return (() => Main({ "id": "bar" }))();
          }
        `;
      const actual = transform(printAst(input), {
        parserOpts: { plugins: ['jsx'] },
        plugins: [reactiveJsx],
        code: true,
      });
      expect(actual?.code).toBe(printAst(expected));
    });
  });
});
