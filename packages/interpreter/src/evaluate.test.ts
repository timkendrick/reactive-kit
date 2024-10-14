import { hash } from '@reactive-kit/hash';
import {
  createEffect,
  createStateful,
  EFFECT,
  type StateToken,
  type Reactive,
} from '@reactive-kit/types';
import { describe, expect, test } from 'vitest';
import { ConditionTree, StateValues, EvaluationResult, DependencyTree } from './types';
import { evaluate } from './evaluate';

describe(evaluate, () => {
  test('static root', () => {
    function main(): Reactive<string> {
      return 'foo';
    }
    const state: StateValues = new Map();
    expect(evaluate(main(), state)).toEqual(
      EvaluationResult.Ready('foo', DependencyTree.Empty({})),
    );
  });

  describe('signal root', () => {
    test('unresolved signal', () => {
      const signal = createEffect<'effect:foo', null, string>('effect:foo', null);
      function main(): Reactive<string> {
        return signal;
      }
      const state: StateValues = new Map();
      expect(evaluate(main(), state)).toEqual(
        EvaluationResult.Pending(
          ConditionTree.Unit({ condition: signal }),
          DependencyTree.Unit({ value: signal[EFFECT] }),
        ),
      );
    });

    test('resolved signal', () => {
      const signal = createEffect<'effect:foo', null, string>('effect:foo', null);
      function main(): Reactive<string> {
        return signal;
      }
      const state: StateValues = new Map([[signal[EFFECT], 'foo']]);
      expect(evaluate(main(), state)).toEqual(
        EvaluationResult.Ready('foo', DependencyTree.Unit({ value: signal[EFFECT] })),
      );
    });
  });

  describe('stateful root', () => {
    test('no dependencies', () => {
      function main(): Reactive<string> {
        return createStateful(hash(main.name), function* main() {
          return 'foo';
        });
      }
      const state: StateValues = new Map();
      expect(evaluate(main(), state)).toEqual(
        EvaluationResult.Ready('foo', DependencyTree.Empty({})),
      );
    });

    describe('single dependency', () => {
      test('unresolved dependency', () => {
        const signal = createEffect<'effect:foo', null, string>('effect:foo', null);
        function main(): Reactive<string> {
          return createStateful(hash(main.name), function* main() {
            const value: string = yield signal;
            return value.toUpperCase();
          });
        }
        const state: StateValues = new Map();
        expect(evaluate(main(), state)).toEqual(
          EvaluationResult.Pending(
            ConditionTree.Unit({ condition: signal }),
            DependencyTree.Unit({ value: signal[EFFECT] }),
          ),
        );
      });

      test('resolved dependency', () => {
        const signal = createEffect<'effect:foo', null, string>('effect:foo', null);
        function main(): Reactive<string> {
          return createStateful(hash(main.name), function* main() {
            const value: string = yield signal;
            return value.toUpperCase();
          });
        }
        const state: StateValues = new Map([[signal[EFFECT], 'foo']]);
        expect(evaluate(main(), state)).toEqual(
          EvaluationResult.Ready('FOO', DependencyTree.Unit({ value: signal[EFFECT] })),
        );
      });
    });

    describe('multiple dependencies', () => {
      test('unresolved dependencies', () => {
        const signal1 = createEffect<'effect:foo', null, string>('effect:foo', null);
        const signal2 = createEffect<'effect:bar', null, string>('effect:bar', null);
        function main(): Reactive<string> {
          return createStateful(hash(main.name), function* main() {
            const value1: string = yield signal1;
            const value2: string = yield signal2;
            return `${value1}.${value2}`;
          });
        }
        const state: StateValues = new Map();
        expect(evaluate(main(), state)).toEqual(
          EvaluationResult.Pending(
            ConditionTree.Unit({ condition: signal1 }),
            DependencyTree.Unit({ value: signal1[EFFECT] }),
          ),
        );
      });

      test('partially resolved dependencies', () => {
        const signal1 = createEffect<'effect:foo', null, string>('effect:foo', null);
        const signal2 = createEffect<'effect:bar', null, string>('effect:bar', null);
        function main(): Reactive<string> {
          return createStateful(hash(main.name), function* main() {
            const value1: string = yield signal1;
            const value2: string = yield signal2;
            return `${value1}.${value2}`;
          });
        }
        const state: StateValues = new Map([[signal1[EFFECT], 'foo']]);
        expect(evaluate(main(), state)).toEqual(
          EvaluationResult.Pending(
            ConditionTree.Unit({ condition: signal2 }),
            DependencyTree.Pair({
              left: DependencyTree.Unit({ value: signal1[EFFECT] }),
              right: DependencyTree.Unit({ value: signal2[EFFECT] }),
            }),
          ),
        );
      });

      test('fully resolved dependencies', () => {
        const signal1 = createEffect<'effect:foo', null, string>('effect:foo', null);
        const signal2 = createEffect<'effect:bar', null, string>('effect:bar', null);
        function main(): Reactive<string> {
          return createStateful(hash(main.name), function* main() {
            const value1: string = yield signal1;
            const value2: string = yield signal2;
            return `${value1}.${value2}`;
          });
        }
        const state: StateValues = new Map([
          [signal1[EFFECT], 'foo'],
          [signal2[EFFECT], 'bar'],
        ]);
        expect(evaluate(main(), state)).toEqual(
          EvaluationResult.Ready(
            'foo.bar',
            DependencyTree.Pair({
              left: DependencyTree.Unit({ value: signal1[EFFECT] }),
              right: DependencyTree.Unit({ value: signal2[EFFECT] }),
            }),
          ),
        );
      });
    });

    describe('chained generators', () => {
      test('Immediately awaited values', () => {
        const signal1 = createEffect<'effect:foo', null, string>('effect:foo', null);
        const signal2 = createEffect<'effect:bar', null, string>('effect:bar', null);
        function left(): Reactive<string> {
          return createStateful(hash(left.name), function* left() {
            const foo: string = yield signal1;
            return `left: ${foo}`;
          });
        }
        function right(): Reactive<string> {
          return createStateful(hash(right.name), function* right() {
            const bar: string = yield signal2;
            return `right: ${bar}`;
          });
        }
        function main(): Reactive<string> {
          return createStateful(hash(main.name), function* main() {
            const leftValue: string = yield left();
            const rightValue: string = yield right();
            return `${leftValue}, ${rightValue}`;
          });
        }
        {
          const state: StateValues = new Map();
          expect(evaluate(main(), state)).toEqual(
            EvaluationResult.Pending(
              ConditionTree.Unit({ condition: signal1 }),
              DependencyTree.Unit({ value: signal1[EFFECT] }),
            ),
          );
        }
        {
          const state: StateValues = new Map([[signal1[EFFECT], 'foo']]);
          expect(evaluate(main(), state)).toEqual(
            EvaluationResult.Pending(
              ConditionTree.Unit({ condition: signal2 }),
              DependencyTree.Pair({
                left: DependencyTree.Unit({ value: signal1[EFFECT] }),
                right: DependencyTree.Unit({ value: signal2[EFFECT] }),
              }),
            ),
          );
        }
        {
          const state: StateValues = new Map([[signal2[EFFECT], 'bar']]);
          expect(evaluate(main(), state)).toEqual(
            EvaluationResult.Pending(
              ConditionTree.Unit({ condition: signal1 }),
              DependencyTree.Unit({ value: signal1[EFFECT] }),
            ),
          );
        }
        {
          const state: StateValues = new Map([
            [signal1[EFFECT], 'foo'],
            [signal2[EFFECT], 'bar'],
          ]);
          expect(evaluate(main(), state)).toEqual(
            EvaluationResult.Ready(
              'left: foo, right: bar',
              DependencyTree.Pair({
                left: DependencyTree.Unit({ value: signal1[EFFECT] }),
                right: DependencyTree.Unit({ value: signal2[EFFECT] }),
              }),
            ),
          );
        }
      });
    });

    describe('chained effect values', () => {
      describe('aliased effect', () => {
        test('partially resolved dependencies', () => {
          const signal1 = createEffect<'effect:foo', null, string>('effect:foo', null);
          const signal2 = createEffect<'effect:bar', null, string>('effect:bar', null);
          function main(): Reactive<string> {
            return createStateful(hash(main.name), function* main() {
              const value: string = yield signal1;
              return value.toUpperCase();
            });
          }
          const state: StateValues = new Map([[signal1[EFFECT], signal2]]);
          expect(evaluate(main(), state)).toEqual(
            EvaluationResult.Pending(
              ConditionTree.Unit({ condition: signal2 }),
              DependencyTree.Pair({
                left: DependencyTree.Unit({ value: signal1[EFFECT] }),
                right: DependencyTree.Unit({ value: signal2[EFFECT] }),
              }),
            ),
          );
        });

        test('fully resolved dependencies', () => {
          const signal1 = createEffect<'effect:foo', null, string>('effect:foo', null);
          const signal2 = createEffect<'effect:bar', null, string>('effect:bar', null);
          function main(): Reactive<string> {
            return createStateful(hash(main.name), function* main() {
              const value: string = yield signal1;
              return value.toUpperCase();
            });
          }
          const state: StateValues = new Map<StateToken, Reactive<string>>([
            [signal1[EFFECT], signal2],
            [signal2[EFFECT], 'foo'],
          ]);
          expect(evaluate(main(), state)).toEqual(
            EvaluationResult.Ready(
              'FOO',
              DependencyTree.Pair({
                left: DependencyTree.Unit({ value: signal1[EFFECT] }),
                right: DependencyTree.Unit({ value: signal2[EFFECT] }),
              }),
            ),
          );
        });
      });

      describe('aliased generator', () => {
        test('partially resolved dependencies', () => {
          const signal1 = createEffect<'effect:foo', null, string>('effect:foo', null);
          const signal2 = createEffect<'effect:bar', null, string>('effect:bar', null);
          function generator(): Reactive<string> {
            return createStateful(hash(generator.name), function* generator() {
              const value: string = yield signal2;
              return `-> ${value}`;
            });
          }
          function main(): Reactive<string> {
            return createStateful(hash(main.name), function* main() {
              const value: string = yield signal1;
              return value.toUpperCase();
            });
          }
          const state: StateValues = new Map([[signal1[EFFECT], generator()]]);
          expect(evaluate(main(), state)).toEqual(
            EvaluationResult.Pending(
              ConditionTree.Unit({ condition: signal2 }),
              DependencyTree.Pair({
                left: DependencyTree.Unit({ value: signal1[EFFECT] }),
                right: DependencyTree.Unit({ value: signal2[EFFECT] }),
              }),
            ),
          );
        });

        test('fully resolved dependencies', () => {
          const signal1 = createEffect<'effect:foo', null, string>('effect:foo', null);
          const signal2 = createEffect<'effect:bar', null, string>('effect:bar', null);
          function generator(): Reactive<string> {
            return createStateful(hash(generator.name), function* generator() {
              const value: string = yield signal2;
              return `-> ${value}`;
            });
          }
          function main(): Reactive<string> {
            return createStateful(hash(main.name), function* main() {
              const value: string = yield signal1;
              return value.toUpperCase();
            });
          }
          const state: StateValues = new Map<StateToken, Reactive<string>>([
            [signal1[EFFECT], generator()],
            [signal2[EFFECT], 'foo'],
          ]);
          expect(evaluate(main(), state)).toEqual(
            EvaluationResult.Ready(
              '-> FOO',
              DependencyTree.Pair({
                left: DependencyTree.Unit({ value: signal1[EFFECT] }),
                right: DependencyTree.Unit({ value: signal2[EFFECT] }),
              }),
            ),
          );
        });
      });
    });
  });
});
