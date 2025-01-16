import { describe, expect, test } from 'vitest';
import { CustomHashable, hash, HASH } from '@reactive-kit/hash';
import {
  createAsync,
  createEffect,
  createFallback,
  createPending,
  createResult,
  EffectExpression,
  Expression,
  TYPE,
  CONTINUE,
  GeneratorContext,
  TYPE_GENERATOR,
  FallbackExpression,
  isEffectExpression,
  createEvaluationPendingResult,
  createEvaluationSuccessResult,
} from '@reactive-kit/types';

import { EvaluationCache, EvaluationCacheValue } from './types';
import { evaluate } from './evaluate';
import { DependencyGraph } from '@reactive-kit/cache';
import { gc } from './gc';

function withNonceHash<T extends object>(value: T): T & CustomHashable {
  return Object.assign(value, {
    [HASH]: BigInt(Math.round(Math.random() * Number.MAX_SAFE_INTEGER)),
  });
}

function isEvaluationCacheEffectResult<T>(
  result: EvaluationCacheValue<T>,
): result is EvaluationCacheValue<T> & {
  expression: EffectExpression<T>;
} {
  return isEffectExpression(result.expression);
}

describe(evaluate, () => {
  test('evaluates result expressions', () => {
    const expression = createResult('foo');
    const cache: EvaluationCache = new DependencyGraph();
    const interpreter = evaluate(expression, cache);
    const result = interpreter.next();
    expect(result).toEqual({
      done: true,
      value: createEvaluationSuccessResult(createResult('foo')),
    });
    expect(gc(cache, [expression], { major: true })).toEqual(new Set([]));
    expect(gc(cache, [], { major: true })).toEqual(new Set([]));
  });

  test('evaluates pending expressions', () => {
    const expression = createPending();
    const cache: EvaluationCache = new DependencyGraph();
    const interpreter = evaluate(expression, cache);
    const result = interpreter.next();
    expect(result).toEqual({
      done: true,
      value: createEvaluationPendingResult(),
    });
    expect(gc(cache, [expression], { major: true })).toEqual(new Set([]));
    expect(gc(cache, [], { major: true })).toEqual(new Set([]));
  });

  test('evaluates effect expressions', () => {
    const expression = createEffect<'foo', string, string>('foo', 'bar');
    const cache: EvaluationCache = new DependencyGraph();
    const interpreter = evaluate(expression, cache);
    const initialResult = interpreter.next();
    expect(initialResult).toEqual({
      done: false,
      value: createEffect<'foo', string, string>('foo', 'bar'),
    });
    const effectValue = createResult('baz');
    const result = interpreter.next(effectValue);
    expect(result).toEqual({
      done: true,
      value: createEvaluationSuccessResult(createResult('baz')),
    });
    expect(gc(cache, [expression], { major: true })).toEqual(new Set([]));
    expect(gc(cache, [], { major: true })).toEqual(
      new Set([createEffect<'foo', string, string>('foo', 'bar')]),
    );
  });

  test('evaluates chained effect expressions', () => {
    const expression = createEffect<'foo', string, string>('foo', 'bar');
    const cache: EvaluationCache = new DependencyGraph();
    const interpreter = evaluate(expression, cache);
    const initialResult = interpreter.next();
    expect(initialResult).toEqual({
      done: false,
      value: createEffect<'foo', string, string>('foo', 'bar'),
    });
    const intermediateEffectValue = createEffect<'foo', string, string>('foo', 'baz');
    const intermediateResult = interpreter.next(intermediateEffectValue);
    expect(intermediateResult).toEqual({
      done: false,
      value: createEffect<'foo', string, string>('foo', 'baz'),
    });
    const effectValue = createResult('qux');
    const result = interpreter.next(effectValue);
    expect(result).toEqual({
      done: true,
      value: createEvaluationSuccessResult(createResult('qux')),
    });
    expect(gc(cache, [expression], { major: true })).toEqual(new Set([]));
    expect(gc(cache, [], { major: true })).toEqual(
      new Set([
        createEffect<'foo', string, string>('foo', 'bar'),
        createEffect<'foo', string, string>('foo', 'baz'),
      ]),
    );
  });

  test('evaluates stateless async expressions', () => {
    const fn = Object.assign(
      withNonceHash(
        (
          context: GeneratorContext<
            { foo: string; bar: string },
            {},
            {},
            {},
            never,
            never,
            never,
            string
          >,
        ): Expression<string> => {
          const { foo, bar } = context.state.args;
          return createResult(foo + bar);
        },
      ),
      {
        [TYPE]: TYPE_GENERATOR as TYPE_GENERATOR,
        [TYPE_GENERATOR]: {
          params: ['foo' as const, 'bar' as const],
          locals: [],
          intermediates: [],
          statics: [],
          tryLocsList: [],
        },
      },
    );
    const expression = createAsync(fn, ['foo', 'bar']);
    const cache: EvaluationCache = new DependencyGraph();
    const interpreter = evaluate(expression, cache);
    const result = interpreter.next();
    expect(result).toEqual({
      done: true,
      value: createEvaluationSuccessResult(createResult('foobar')),
    });
    expect(gc(cache, [expression], { major: true })).toEqual(new Set([]));
    expect(gc(cache, [], { major: true })).toEqual(new Set([]));
  });

  test('evaluates stateful async expressions with pending effects', () => {
    const fn = Object.assign(
      withNonceHash(
        (
          context: GeneratorContext<
            { foo: string; bar: string },
            {},
            {},
            {},
            EffectExpression<string>,
            string,
            never,
            string
          >,
        ): Expression<string> | CONTINUE => {
          const { foo, bar } = context.state.args;
          switch (context.state.next) {
            case 0: {
              context.state.prev = 0;
              context.state.next = 1;
              return context.yield(createEffect<'fetch', string, string>('fetch', 'baz'));
            }
            case 1: {
              context.state.prev = 1;
              const baz = context.sent;
              return context.abrupt('return', foo + bar + baz);
            }
            case 0x1fffffffffffff:
              return context.stop();
            default: {
              throw new Error(`Invalid state: ${context.state.next}`);
            }
          }
        },
      ),
      {
        [TYPE]: TYPE_GENERATOR as TYPE_GENERATOR,
        [TYPE_GENERATOR]: {
          params: ['foo' as const, 'bar' as const],
          locals: [],
          intermediates: [],
          statics: [],
          tryLocsList: [],
        },
      },
    );
    const expression = createAsync(fn, ['foo', 'bar']);
    const cache: EvaluationCache = new DependencyGraph();
    const interpreter = evaluate(expression, cache);
    const initialResult = interpreter.next();
    expect(initialResult).toEqual({
      done: false,
      value: createEffect<'fetch', string, string>('fetch', 'baz'),
    });
    const effectValue = createPending();
    const result = interpreter.next(effectValue);
    expect(result).toEqual({
      done: true,
      value: createEvaluationPendingResult(),
    });
    expect(gc(cache, [expression], { major: true })).toEqual(new Set([]));
    expect(gc(cache, [], { major: true })).toEqual(
      new Set([createEffect<'fetch', string, string>('fetch', 'baz')]),
    );
  });

  test('evaluates stateful async expressions with resolved effects', () => {
    const fn = Object.assign(
      withNonceHash(
        (
          context: GeneratorContext<
            { foo: string; bar: string },
            {},
            {},
            {},
            EffectExpression<string>,
            string,
            never,
            string
          >,
        ): Expression<string> | CONTINUE => {
          const { foo, bar } = context.state.args;
          switch (context.state.next) {
            case 0: {
              context.state.prev = 0;
              context.state.next = 1;
              return context.yield(createEffect<'fetch', string, string>('fetch', 'baz'));
            }
            case 1: {
              context.state.prev = 1;
              const baz = context.sent;
              return context.abrupt('return', foo + bar + baz);
            }
            case 0x1fffffffffffff:
              return context.stop();
            default: {
              throw new Error(`Invalid state: ${context.state.next}`);
            }
          }
        },
      ),
      {
        [TYPE]: TYPE_GENERATOR as TYPE_GENERATOR,
        [TYPE_GENERATOR]: {
          params: ['foo' as const, 'bar' as const],
          locals: [],
          intermediates: [],
          statics: [],
          tryLocsList: [],
        },
      },
    );
    const expression = createAsync(fn, ['foo', 'bar']);
    const cache: EvaluationCache = new DependencyGraph();
    const interpreter = evaluate(expression, cache);
    const initialResult = interpreter.next();
    expect(initialResult).toEqual({
      done: false,
      value: createEffect<'fetch', string, string>('fetch', 'baz'),
    });
    const effectValue = createResult('BAZ');
    const result = interpreter.next(effectValue);
    expect(result).toEqual({
      done: true,
      value: createEvaluationSuccessResult(createResult('foobarBAZ')),
    });
    expect(gc(cache, [expression], { major: true })).toEqual(new Set([]));
    expect(gc(cache, [], { major: true })).toEqual(
      new Set([createEffect<'fetch', string, string>('fetch', 'baz')]),
    );
  });

  test('evaluates stateful async expressions with pending effect fallback', () => {
    const fn = Object.assign(
      withNonceHash(
        (
          context: GeneratorContext<
            { foo: string; bar: string },
            {},
            {},
            {},
            EffectExpression<string>,
            string,
            never,
            string
          >,
        ): Expression<string> | CONTINUE => {
          const { foo, bar } = context.state.args;
          switch (context.state.next) {
            case 0: {
              context.state.prev = 0;
              context.state.next = 1;
              return context.yield(createEffect<'fetch', string, string>('fetch', 'baz'));
            }
            case 1: {
              context.state.prev = 1;
              const baz = context.sent;
              return context.abrupt('return', foo + bar + baz);
            }
            case 0x1fffffffffffff:
              return context.stop();
            default: {
              throw new Error(`Invalid state: ${context.state.next}`);
            }
          }
        },
      ),
      {
        [TYPE]: TYPE_GENERATOR as TYPE_GENERATOR,
        [TYPE_GENERATOR]: {
          params: ['foo' as const, 'bar' as const],
          locals: [],
          intermediates: [],
          statics: [],
          tryLocsList: [],
        },
      },
    );
    const expression = createFallback(createAsync(fn, ['foo', 'bar']), createResult<string>('qux'));
    const cache: EvaluationCache = new DependencyGraph();
    const interpreter = evaluate(expression, cache);
    const initialResult = interpreter.next();
    expect(initialResult).toEqual({
      done: false,
      value: createEffect<'fetch', string, string>('fetch', 'baz'),
    });
    const effectValue = createPending();
    const result = interpreter.next(effectValue);
    expect(result).toEqual({
      done: true,
      value: createEvaluationSuccessResult(createResult('qux')),
    });
    expect(gc(cache, [expression], { major: true })).toEqual(new Set([]));
    expect(gc(cache, [], { major: true })).toEqual(
      new Set([createEffect<'fetch', string, string>('fetch', 'baz')]),
    );
  });

  test('evaluates stateful async expressions with delegated pending effect fallback', () => {
    const fn = Object.assign(
      withNonceHash(
        (
          context: GeneratorContext<
            { foo: string; bar: string },
            {},
            {},
            {},
            FallbackExpression<string, string>,
            string,
            never,
            string
          >,
        ): Expression<string> | CONTINUE => {
          const { foo, bar } = context.state.args;
          switch (context.state.next) {
            case 0: {
              context.state.prev = 0;
              context.state.next = 1;
              return context.yield(
                createFallback(
                  createEffect<'fetch', string, string>('fetch', 'first'),
                  createFallback(
                    createEffect<'fetch', string, string>('fetch', 'second'),
                    createResult<string>('qux'),
                  ),
                ),
              );
            }
            case 1: {
              context.state.prev = 1;
              const baz = context.sent;
              return context.abrupt('return', foo + bar + baz);
            }
            case 0x1fffffffffffff:
              return context.stop();
            default: {
              throw new Error(`Invalid state: ${context.state.next}`);
            }
          }
        },
      ),
      {
        [TYPE]: TYPE_GENERATOR as TYPE_GENERATOR,
        [TYPE_GENERATOR]: {
          params: ['foo' as const, 'bar' as const],
          locals: [],
          intermediates: [],
          statics: [],
          tryLocsList: [],
        },
      },
    );
    const expression = createAsync(fn, ['foo', 'bar']);
    const cache: EvaluationCache = new DependencyGraph();
    const interpreter = evaluate(expression, cache);
    const initialResult = interpreter.next();
    expect(initialResult).toEqual({
      done: false,
      value: createEffect<'fetch', string, string>('fetch', 'first'),
    });
    const initialEffectValue = createPending();
    const intermediateResult = interpreter.next(initialEffectValue);
    expect(intermediateResult).toEqual({
      done: false,
      value: createEffect<'fetch', string, string>('fetch', 'second'),
    });
    const intermediateEffectValue = createPending();
    const result = interpreter.next(intermediateEffectValue);
    expect(result).toEqual({
      done: true,
      value: createEvaluationSuccessResult(createResult('foobarqux')),
    });
    expect(gc(cache, [expression], { major: true })).toEqual(new Set([]));
    expect(gc(cache, [], { major: true })).toEqual(
      new Set([
        createEffect<'fetch', string, string>('fetch', 'first'),
        createEffect<'fetch', string, string>('fetch', 'second'),
      ]),
    );
  });

  test('evaluates stateless async expressions with unused pending fallback', () => {
    const fn = Object.assign(
      withNonceHash(
        (
          context: GeneratorContext<
            { foo: string; bar: string },
            {},
            {},
            {},
            never,
            never,
            never,
            string
          >,
        ): Expression<string> => {
          const { foo, bar } = context.state.args;
          return createResult(foo + bar);
        },
      ),
      {
        [TYPE]: TYPE_GENERATOR as TYPE_GENERATOR,
        [TYPE_GENERATOR]: {
          params: ['foo' as const, 'bar' as const],
          locals: [],
          intermediates: [],
          statics: [],
          tryLocsList: [],
        },
      },
    );
    const expression = createFallback(createAsync(fn, ['foo', 'bar']), createResult<string>('qux'));
    const cache: EvaluationCache = new DependencyGraph();
    const interpreter = evaluate(expression, cache);
    const result = interpreter.next();
    expect(result).toEqual({
      done: true,
      value: createEvaluationSuccessResult(createResult('foobar')),
    });
    expect(gc(cache, [expression], { major: true })).toEqual(new Set([]));
    expect(gc(cache, [], { major: true })).toEqual(new Set([]));
  });

  test('evaluates stateful async expressions with unused pending fallback', () => {
    const fn = Object.assign(
      withNonceHash(
        (
          context: GeneratorContext<
            { foo: string; bar: string },
            {},
            {},
            {},
            EffectExpression<string>,
            string,
            never,
            string
          >,
        ): Expression<string> | CONTINUE => {
          const { foo, bar } = context.state.args;
          switch (context.state.next) {
            case 0: {
              context.state.prev = 0;
              context.state.next = 1;
              return context.yield(createEffect<'fetch', string, string>('fetch', 'baz'));
            }
            case 1: {
              context.state.prev = 1;
              const baz = context.sent;
              return context.abrupt('return', foo + bar + baz);
            }
            case 0x1fffffffffffff:
              return context.stop();
            default: {
              throw new Error(`Invalid state: ${context.state.next}`);
            }
          }
        },
      ),
      {
        [TYPE]: TYPE_GENERATOR as TYPE_GENERATOR,
        [TYPE_GENERATOR]: {
          params: ['foo' as const, 'bar' as const],
          locals: [],
          intermediates: [],
          statics: [],
          tryLocsList: [],
        },
      },
    );
    const expression = createFallback(createAsync(fn, ['foo', 'bar']), createResult<string>('qux'));
    const cache: EvaluationCache = new DependencyGraph();
    const interpreter = evaluate(expression, cache);
    const initialResult = interpreter.next();
    expect(initialResult).toEqual({
      done: false,
      value: createEffect<'fetch', string, string>('fetch', 'baz'),
    });
    const effectValue = createResult('BAZ');
    const result = interpreter.next(effectValue);
    expect(result).toEqual({
      done: true,
      value: createEvaluationSuccessResult(createResult('foobarBAZ')),
    });
    expect(gc(cache, [expression], { major: true })).toEqual(new Set([]));
    expect(gc(cache, [], { major: true })).toEqual(
      new Set([createEffect<'fetch', string, string>('fetch', 'baz')]),
    );
  });
});
