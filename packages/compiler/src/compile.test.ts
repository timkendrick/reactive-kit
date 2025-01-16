import { printAst, template, types as t } from '@reactive-kit/babel-test-utils';
import { hashAstNode } from '@reactive-kit/babel-plugin-reactive-functions/src/utils/ast';
import { describe, expect, test } from 'vitest';

import { compile } from './compile';
import { CompilerOptions } from './types';

describe(compile, () => {
  test('transforms top-level async functions', () => {
    const input = template.program.ast/* javascript */ `
      async function map(expression, transform) {
        const value = await expression;
        return transform(value);
      }
    `;
    const functionDeclaration = input.body[0] as t.FunctionDeclaration;
    const functionHash = t.bigIntLiteral(String(hashAstNode(functionDeclaration)));
    const expected = template.program.ast/* javascript */ `
      function map$(_context) {
        while (1) switch (_context.state.prev = _context.state.next) {
          case 0:
            _context.state.next = 2;
            return _context["yield"](_context.state.args.expression);
          case 2:
            _context.state.locals.value = _context.sent;
            return _context.abrupt("return", _context.state.args.transform(_context.state.locals.value));
          case 4:
          case 0x1fffffffffffff:
          default:
            return _context.stop();
        }
      }
      map$[Symbol.for("@reactive-kit/symbols/hash")] = (_hash) => _hash("@reactive-kit/symbols/type/generator", ${functionHash})
      map$[Symbol.for("@reactive-kit/symbols/type")] = Symbol.for("@reactive-kit/symbols/type/generator")
      map$[Symbol.for("@reactive-kit/symbols/generator")] = {
        params: ["expression", "transform"],
        locals: ["value"],
        intermediates: [],
        statics: [],
        tryLocsList: null
      };
      
      function map(expression, transform) {
        return {
          [Symbol.for("@reactive-kit/symbols/hash")]: (_hash) => _hash("@reactive-kit/symbols/expression/type/async", ${functionHash}, expression, transform),
          [Symbol.for("@reactive-kit/symbols/type")]: Symbol.for("@reactive-kit/symbols/type/expression"),
          [Symbol.for("@reactive-kit/symbols/expression/type")]: Symbol.for("@reactive-kit/symbols/expression/type/async"),
          target: map$,
          args: [expression, transform]
        };
      }
    `;
    const options: CompilerOptions = {
      filename: 'test.js',
    };
    const actual = compile(printAst(input), options);
    expect(actual).toBe(printAst(expected));
  });

  test('transforms nested async functions', () => {
    const input = template.program.ast/* javascript */ `
      function foo(transform, expression) {
        async function map(expression, transform) {
          const value = await expression;
          return transform(value);
        }
        return map(expression, transform);
      }
    `;
    const wrapperFunctionDeclaration = input.body[0] as t.FunctionDeclaration;
    const asyncFunctionDeclaration = wrapperFunctionDeclaration.body
      .body[0] as t.FunctionDeclaration;
    // Async function hoisting renames the declaration
    const renamedAsyncFunctionDeclaration = {
      ...asyncFunctionDeclaration,
      id: t.identifier('_' + (asyncFunctionDeclaration.id?.name ?? '')),
    };
    const functionHash = t.bigIntLiteral(String(hashAstNode(renamedAsyncFunctionDeclaration)));
    const expected = template.program.ast/* javascript */ `
      function _map$(_context) {
        while (1) switch (_context.state.prev = _context.state.next) {
          case 0:
            _context.state.next = 2;
            return _context["yield"](_context.state.args.expression);
          case 2:
            _context.state.locals.value = _context.sent;
            return _context.abrupt("return", _context.state.args.transform(_context.state.locals.value));
          case 4:
          case 0x1fffffffffffff:
          default:
            return _context.stop();
        }
      }
      _map$[Symbol.for("@reactive-kit/symbols/hash")] = (_hash) => _hash("@reactive-kit/symbols/type/generator", ${functionHash})
      _map$[Symbol.for("@reactive-kit/symbols/type")] = Symbol.for("@reactive-kit/symbols/type/generator")
      _map$[Symbol.for("@reactive-kit/symbols/generator")] = {
        params: ["expression", "transform"],
        locals: ["value"],
        intermediates: [],
        statics: [],
        tryLocsList: null
      };
      
      function _map(expression, transform) {
        return {
          [Symbol.for("@reactive-kit/symbols/hash")]: (_hash) => _hash("@reactive-kit/symbols/expression/type/async", ${functionHash}, expression, transform),
          [Symbol.for("@reactive-kit/symbols/type")]: Symbol.for("@reactive-kit/symbols/type/expression"),
          [Symbol.for("@reactive-kit/symbols/expression/type")]: Symbol.for("@reactive-kit/symbols/expression/type/async"),
          target: _map$,
          args: [expression, transform]
        };
      }
      
      function foo(transform, expression) {
        function map(expression, transform) {
          return _map(expression, transform);
        }
        return map(expression, transform);
      }
    `;
    const options: CompilerOptions = {
      filename: 'test.js',
    };
    const actual = compile(printAst(input), options);

    expect(actual).toBe(printAst(expected));
  });
});
