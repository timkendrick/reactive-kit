import { describe, expect, test } from 'vitest';

import { printAst, template, transform, types as t } from '@reactive-kit/babel-test-utils';

import { hashAstNode } from '../utils/ast';

import { transformAsyncFunctions } from './transformAsyncFunctions';

describe(transformAsyncFunctions, () => {
  test('transforms async function declarations', () => {
    const input = template.program.ast /* javascript */ `
    async function foo(bar, baz) {
      let result;
      const x = 3;
      const y = bar + baz + x + await useFirst();
      const z = bar + baz + y + await useSecond();
      if (z) {
        const a = await useThird();
        return a;
      } else {
        foo: while (true) {
          try {
            const b = await useFourth();
            result = b + await useFifth();
            if (result > 10) {
              break foo;
            }
            continue;
          } catch (c) {
            throw new Error('error', { cause: c });
          } finally {
            console.log('done')
          }
        }
      }
      return result;
    }
    `;
    const functionHash = t.bigIntLiteral(String(hashAstNode(input.body[0])));
    const expected = template.program.ast /* javascript */ `
      function foo$(_context) {
        while (1) switch (_context.state.prev = _context.state.next) {
          case 0:
            _context.state.locals.x = 3;
            _context.state.intermediates.t0 = _context.state.args.bar + _context.state.args.baz + _context.state.locals.x;
            _context.state.next = 4;
            return _context["yield"](useFirst());
          case 4:
            _context.state.intermediates.t1 = _context.sent;
            _context.state.locals.y = _context.state.intermediates.t0 + _context.state.intermediates.t1;
            _context.state.intermediates.t2 = _context.state.args.bar + _context.state.args.baz + _context.state.locals.y;
            _context.state.next = 9;
            return _context["yield"](useSecond());
          case 9:
            _context.state.intermediates.t3 = _context.sent;
            _context.state.locals.z = _context.state.intermediates.t2 + _context.state.intermediates.t3;
            if (!_context.state.locals.z) {
              _context.state.next = 18;
              break;
            }
            _context.state.next = 14;
            return _context["yield"](useThird());
          case 14:
            _context.state.locals.a = _context.sent;
            return _context.abrupt("return", _context.state.locals.a);
          case 18:
            if (!true) {
              _context.state.next = 41;
              break;
            }
            _context.state.prev = 19;
            _context.state.next = 22;
            return _context["yield"](useFourth());
          case 22:
            _context.state.locals.b = _context.sent;
            _context.state.intermediates.t4 = _context.state.locals.b;
            _context.state.next = 26;
            return _context["yield"](useFifth());
          case 26:
            _context.state.intermediates.t5 = _context.sent;
            _context.state.locals.result = _context.state.intermediates.t4 + _context.state.intermediates.t5;
            if (!(_context.state.locals.result > 10)) {
              _context.state.next = 30;
              break;
            }
            return _context.abrupt("break", 41);
          case 30:
            return _context.abrupt("continue", 18);
          case 33:
            _context.state.prev = 33;
            _context.state.intermediates.t6 = _context["catch"](19);
            throw new Error('error', {
              cause: _context.state.intermediates.t6
            });
          case 36:
            _context.state.prev = 36;
            console.log('done');
            return _context.finish(36);
          case 39:
            _context.state.next = 18;
            break;
          case 41:
            return _context.abrupt("return", _context.state.locals.result);
          case 42:
          case 0x1fffffffffffff:
          default:
            return _context.stop();
        }
      }
      foo$[Symbol.for("@reactive-kit/symbols/hash")] = (_hash) => _hash("@reactive-kit/symbols/type/generator", ${functionHash})
      foo$[Symbol.for("@reactive-kit/symbols/type")] = Symbol.for("@reactive-kit/symbols/type/generator")
      foo$[Symbol.for("@reactive-kit/symbols/generator")] = {
        params: ["bar", "baz"],
        locals: ["result", "x", "y", "z", "a", "b"],
        intermediates: ["t0", "t1", "t2", "t3", "t4", "t5", "t6"],
        statics: [],
        tryLocsList: [[19, 33, 36, 39]],
      }

      function foo(bar, baz) {
        return {
          [Symbol.for("@reactive-kit/symbols/hash")]: (_hash) => _hash("@reactive-kit/symbols/expression/type/async", ${functionHash}, bar, baz),
          [Symbol.for("@reactive-kit/symbols/type")]: Symbol.for("@reactive-kit/symbols/type/expression"),
          [Symbol.for("@reactive-kit/symbols/expression/type")]: Symbol.for("@reactive-kit/symbols/expression/type/async"),
          target: foo$,
          args: [bar, baz],
        };
      }
    `;
    const actual = transform(printAst(input), {
      plugins: [transformAsyncFunctions],
      code: true,
    });
    expect(actual?.code).toBe(printAst(expected));
  });

  test('allows destructuring awaited values', () => {
    const input = template.program.ast /* javascript */ `
      async function foo() {
        const { bar } = await "bar";
        return bar;
      }
    `;
    const functionHash = t.bigIntLiteral(String(hashAstNode(input.body[0])));
    const expected = template.program.ast /* javascript */ `
      function foo$(_context) {
        while (1) switch (_context.state.prev = _context.state.next) {
          case 0:
            _context.state.next = 2;
            return _context["yield"]("bar");
          case 2:
            _context.state.locals._await$bar = _context.sent;
            _context.state.locals.bar = _context.state.locals._await$bar.bar;
            return _context.abrupt("return", _context.state.locals.bar);
          case 5:
          case 0x1fffffffffffff:
          default:
            return _context.stop();
        }
      }
      foo$[Symbol.for("@reactive-kit/symbols/hash")] = _hash => _hash("@reactive-kit/symbols/type/generator", ${functionHash});
      foo$[Symbol.for("@reactive-kit/symbols/type")] = Symbol.for("@reactive-kit/symbols/type/generator");
      foo$[Symbol.for("@reactive-kit/symbols/generator")] = {
        params: [],
        locals: ["_await$bar", "bar"],
        intermediates: [],
        statics: [],
        tryLocsList: null
      };
      function foo() {
        return {
          [Symbol.for("@reactive-kit/symbols/hash")]: _hash => _hash("@reactive-kit/symbols/expression/type/async", ${functionHash}),
          [Symbol.for("@reactive-kit/symbols/type")]: Symbol.for("@reactive-kit/symbols/type/expression"),
          [Symbol.for("@reactive-kit/symbols/expression/type")]: Symbol.for("@reactive-kit/symbols/expression/type/async"),
          target: foo$,
          args: []
        };
      }
    `;
    const actual = transform(printAst(input), {
      plugins: [transformAsyncFunctions],
      code: true,
    });
    expect(actual?.code).toBe(printAst(expected));
  });

  test('allows non-serializable static values', () => {
    const input = template.program.ast /* javascript */ `
      async function foo() {
        return Number(await 3);
      }
    `;
    const functionHash = t.bigIntLiteral(String(hashAstNode(input.body[0])));
    const expected = template.program.ast /* javascript */ `
      function foo$(_context) {
        while (1) switch (_context.state.prev = _context.state.next) {
          case 0:
            _context.state.statics.t0 = Number;
            _context.state.next = 3;
            return _context["yield"](3);
          case 3:
            _context.state.intermediates.t1 = _context.sent;
            return _context.abrupt("return", (0, _context.state.statics.t0)(_context.state.intermediates.t1));
          case 5:
          case 0x1fffffffffffff:
          default:
            return _context.stop();
        }
      }
      foo$[Symbol.for("@reactive-kit/symbols/hash")] = _hash => _hash("@reactive-kit/symbols/type/generator", ${functionHash});
      foo$[Symbol.for("@reactive-kit/symbols/type")] = Symbol.for("@reactive-kit/symbols/type/generator");
      foo$[Symbol.for("@reactive-kit/symbols/generator")] = {
        params: [],
        locals: [],
        intermediates: ["t1"],
        statics: ["t0"],
        tryLocsList: null
      };
      function foo() {
        return {
          [Symbol.for("@reactive-kit/symbols/hash")]: _hash => _hash("@reactive-kit/symbols/expression/type/async", ${functionHash}),
          [Symbol.for("@reactive-kit/symbols/type")]: Symbol.for("@reactive-kit/symbols/type/expression"),
          [Symbol.for("@reactive-kit/symbols/expression/type")]: Symbol.for("@reactive-kit/symbols/expression/type/async"),
          target: foo$,
          args: []
        };
      }
    `;
    const actual = transform(printAst(input), {
      plugins: [transformAsyncFunctions],
      code: true,
    });
    expect(actual?.code).toBe(printAst(expected));
  });
});
