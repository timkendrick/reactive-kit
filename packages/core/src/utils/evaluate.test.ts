import { describe, expect, test } from 'vitest';
import {
  ConditionTree,
  Reactive,
  EFFECT,
  StateToken,
  StateValues,
  Stateful,
  StatefulIterator,
  EvaluationResult,
  DependencyTree,
} from '@trigger/types';
import { evaluate } from './evaluate';
import { createEffect } from './effect';
import { createStatefulGenerator } from './state';
import { hash } from './hash';

describe(evaluate, () => {
  test('static root', () => {
    const root: Reactive<string> = 'foo';
    const state: StateValues = new Map();
    expect(evaluate(root, state)).toEqual(EvaluationResult.Ready('foo', DependencyTree.Empty({})));
  });

  describe('signal root', () => {
    test('unresolved signal', () => {
      const signal = createEffect('effect:foo', null);
      const root: Reactive<string> = signal;
      const state: StateValues = new Map();
      expect(evaluate(root, state)).toEqual(
        EvaluationResult.Pending(
          ConditionTree.Unit({ condition: signal }),
          DependencyTree.Unit({ value: signal[EFFECT] }),
        ),
      );
    });

    test('resolved signal', () => {
      const signal = createEffect('effect:foo', null);
      const root: Reactive<string> = signal;
      const state: StateValues = new Map([[signal[EFFECT], 'foo']]);
      expect(evaluate(root, state)).toEqual(
        EvaluationResult.Ready('foo', DependencyTree.Unit({ value: signal[EFFECT] })),
      );
    });
  });

  describe('stateful root', () => {
    test.only('no dependencies', () => {
      const root = createStatefulGenerator(hash('root'), function* () {
        return 'foo';
      });
      const state: StateValues = new Map();
      expect(evaluate(root, state)).toEqual(
        EvaluationResult.Ready('foo', DependencyTree.Empty({})),
      );
    });

    describe('single dependency', () => {
      test('unresolved dependency', () => {
        const signal = createEffect('effect:foo', null);
        const root = createStatefulGenerator(hash('root'), function* () {
          const value: string = yield signal;
          return value.toUpperCase();
        });
        const state: StateValues = new Map();
        expect(evaluate(root, state)).toEqual(
          EvaluationResult.Pending(
            ConditionTree.Unit({ condition: signal }),
            DependencyTree.Unit({ value: signal[EFFECT] }),
          ),
        );
      });

      test('resolved dependency', () => {
        const signal = createEffect('effect:foo', null);
        const root = createStatefulGenerator(hash('root'), function* () {
          const value: string = yield signal;
          return value.toUpperCase();
        });
        const state: StateValues = new Map([[signal[EFFECT], 'foo']]);
        expect(evaluate(root, state)).toEqual(
          EvaluationResult.Ready('FOO', DependencyTree.Unit({ value: signal[EFFECT] })),
        );
      });
    });

    describe('multiple dependencies', () => {
      test('unresolved dependencies', () => {
        const signal1 = createEffect('effect:foo', null);
        const signal2 = createEffect('effect:bar', null);
        const root = createStatefulGenerator(hash('root'), function* () {
          const value1: string = yield signal1;
          const value2: string = yield signal2;
          return `${value1}.${value2}`;
        });
        const state: StateValues = new Map();
        expect(evaluate(root, state)).toEqual(
          EvaluationResult.Pending(
            ConditionTree.Unit({ condition: signal1 }),
            DependencyTree.Unit({ value: signal1[EFFECT] }),
          ),
        );
      });

      test('partially resolved dependencies', () => {
        const signal1 = createEffect('effect:foo', null);
        const signal2 = createEffect('effect:bar', null);
        const root = createStatefulGenerator(hash('root'), function* () {
          const value1: string = yield signal1;
          const value2: string = yield signal2;
          return `${value1}.${value2}`;
        });
        const state: StateValues = new Map([[signal1[EFFECT], 'foo']]);
        expect(evaluate(root, state)).toEqual(
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
        const signal1 = createEffect('effect:foo', null);
        const signal2 = createEffect('effect:bar', null);
        const root = createStatefulGenerator(hash('root'), function* () {
          const value1: string = yield signal1;
          const value2: string = yield signal2;
          return `${value1}.${value2}`;
        });
        const state: StateValues = new Map([
          [signal1[EFFECT], 'foo'],
          [signal2[EFFECT], 'bar'],
        ]);
        expect(evaluate(root, state)).toEqual(
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

    describe('chained dependencies', () => {
      describe('aliased effect', () => {
        test('partially resolved dependencies', () => {
          const signal1 = createEffect('effect:foo', null);
          const signal2 = createEffect('effect:bar', null);
          const root = createStatefulGenerator(hash('root'), function* () {
            const value: string = yield signal1;
            return value.toUpperCase();
          });
          const state: StateValues = new Map([[signal1[EFFECT], signal2]]);
          expect(evaluate(root, state)).toEqual(
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
          const signal1 = createEffect('effect:foo', null);
          const signal2 = createEffect('effect:bar', null);
          const root = createStatefulGenerator(hash('root'), function* () {
            const value: string = yield signal1;
            return value.toUpperCase();
          });
          const state: StateValues = new Map<StateToken, Reactive<string>>([
            [signal1[EFFECT], signal2],
            [signal2[EFFECT], 'foo'],
          ]);
          expect(evaluate(root, state)).toEqual(
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
          const signal1 = createEffect('effect:foo', null);
          const signal2 = createEffect('effect:bar', null);
          const generator = createStatefulGenerator(hash('root'), function* () {
            const value = yield signal2;
            return `-> ${value}`;
          });
          const root = createStatefulGenerator(hash('root'), function* () {
            const value: string = yield signal1;
            return value.toUpperCase();
          });
          const state: StateValues = new Map([[signal1[EFFECT], generator]]);
          expect(evaluate(root, state)).toEqual(
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
          const signal1 = createEffect('effect:foo', null);
          const signal2 = createEffect('effect:bar', null);
          const generator = createStatefulGenerator(hash('root'), function* () {
            const value = yield signal2;
            return `-> ${value}`;
          });
          const root = createStatefulGenerator(hash('root'), function* () {
            const value: string = yield signal1;
            return value.toUpperCase();
          });
          const state: StateValues = new Map<StateToken, Reactive<string>>([
            [signal1[EFFECT], generator],
            [signal2[EFFECT], 'foo'],
          ]);
          expect(evaluate(root, state)).toEqual(
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
