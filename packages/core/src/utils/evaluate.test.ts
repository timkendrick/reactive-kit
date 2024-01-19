import { describe, expect, test } from 'vitest';
import {
  ConditionTree,
  Reactive,
  SIGNAL,
  StateToken,
  StateValues,
  Stateful,
  StatefulGenerator,
  EvaluationResult,
  DependencyTree,
} from '@trigger/types';
import { evaluate } from './evaluate';
import { createEffect } from './effect';

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
          DependencyTree.Unit({ value: signal[SIGNAL] }),
        ),
      );
    });

    test('resolved signal', () => {
      const signal = createEffect('effect:foo', null);
      const root: Reactive<string> = signal;
      const state: StateValues = new Map([[signal[SIGNAL], 'foo']]);
      expect(evaluate(root, state)).toEqual(
        EvaluationResult.Ready('foo', DependencyTree.Unit({ value: signal[SIGNAL] })),
      );
    });
  });

  describe('stateful root', () => {
    test('no dependencies', () => {
      const root: Stateful<string> = function* () {
        return 'foo';
      };
      const state: StateValues = new Map();
      expect(evaluate(root, state)).toEqual(
        EvaluationResult.Ready('foo', DependencyTree.Empty({})),
      );
    });

    describe('single dependency', () => {
      test('unresolved dependency', () => {
        const signal = createEffect('effect:foo', null);
        const root: Stateful<string> = function* (): StatefulGenerator<string> {
          const value: string = yield signal;
          return value.toUpperCase();
        };
        const state: StateValues = new Map();
        expect(evaluate(root, state)).toEqual(
          EvaluationResult.Pending(
            ConditionTree.Unit({ condition: signal }),
            DependencyTree.Unit({ value: signal[SIGNAL] }),
          ),
        );
      });

      test('resolved dependency', () => {
        const signal = createEffect('effect:foo', null);
        const root: Stateful<string> = function* () {
          const value: string = yield signal;
          return value.toUpperCase();
        };
        const state: StateValues = new Map([[signal[SIGNAL], 'foo']]);
        expect(evaluate(root, state)).toEqual(
          EvaluationResult.Ready('FOO', DependencyTree.Unit({ value: signal[SIGNAL] })),
        );
      });
    });

    describe('multiple dependencies', () => {
      test('unresolved dependencies', () => {
        const signal1 = createEffect('effect:foo', null);
        const signal2 = createEffect('effect:bar', null);
        const root: Stateful<string> = function* () {
          const value1: string = yield signal1;
          const value2: string = yield signal2;
          return `${value1}.${value2}`;
        };
        const state: StateValues = new Map();
        expect(evaluate(root, state)).toEqual(
          EvaluationResult.Pending(
            ConditionTree.Unit({ condition: signal1 }),
            DependencyTree.Unit({ value: signal1[SIGNAL] }),
          ),
        );
      });

      test('partially resolved dependencies', () => {
        const signal1 = createEffect('effect:foo', null);
        const signal2 = createEffect('effect:bar', null);
        const root: Stateful<string> = function* () {
          const value1: string = yield signal1;
          const value2: string = yield signal2;
          return `${value1}.${value2}`;
        };
        const state: StateValues = new Map([[signal1[SIGNAL], 'foo']]);
        expect(evaluate(root, state)).toEqual(
          EvaluationResult.Pending(
            ConditionTree.Unit({ condition: signal2 }),
            DependencyTree.Pair({
              left: DependencyTree.Unit({ value: signal1[SIGNAL] }),
              right: DependencyTree.Unit({ value: signal2[SIGNAL] }),
            }),
          ),
        );
      });

      test('fully resolved dependencies', () => {
        const signal1 = createEffect('effect:foo', null);
        const signal2 = createEffect('effect:bar', null);
        const root: Stateful<string> = function* () {
          const value1: string = yield signal1;
          const value2: string = yield signal2;
          return `${value1}.${value2}`;
        };
        const state: StateValues = new Map([
          [signal1[SIGNAL], 'foo'],
          [signal2[SIGNAL], 'bar'],
        ]);
        expect(evaluate(root, state)).toEqual(
          EvaluationResult.Ready(
            'foo.bar',
            DependencyTree.Pair({
              left: DependencyTree.Unit({ value: signal1[SIGNAL] }),
              right: DependencyTree.Unit({ value: signal2[SIGNAL] }),
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
          const root: Stateful<string> = function* (): StatefulGenerator<string> {
            const value: string = yield signal1;
            return value.toUpperCase();
          };
          const state: StateValues = new Map([[signal1[SIGNAL], signal2]]);
          expect(evaluate(root, state)).toEqual(
            EvaluationResult.Pending(
              ConditionTree.Unit({ condition: signal2 }),
              DependencyTree.Pair({
                left: DependencyTree.Unit({ value: signal1[SIGNAL] }),
                right: DependencyTree.Unit({ value: signal2[SIGNAL] }),
              }),
            ),
          );
        });

        test('fully resolved dependencies', () => {
          const signal1 = createEffect('effect:foo', null);
          const signal2 = createEffect('effect:bar', null);
          const root: Stateful<string> = function* (): StatefulGenerator<string> {
            const value: string = yield signal1;
            return value.toUpperCase();
          };
          const state: StateValues = new Map<StateToken, Reactive<string>>([
            [signal1[SIGNAL], signal2],
            [signal2[SIGNAL], 'foo'],
          ]);
          expect(evaluate(root, state)).toEqual(
            EvaluationResult.Ready(
              'FOO',
              DependencyTree.Pair({
                left: DependencyTree.Unit({ value: signal1[SIGNAL] }),
                right: DependencyTree.Unit({ value: signal2[SIGNAL] }),
              }),
            ),
          );
        });
      });

      describe('aliased generator', () => {
        test('partially resolved dependencies', () => {
          const signal1 = createEffect('effect:foo', null);
          const signal2 = createEffect('effect:bar', null);
          const generator: Stateful<string> = function* () {
            const value = yield signal2;
            return `-> ${value}`;
          };
          const root: Stateful<string> = function* (): StatefulGenerator<string> {
            const value: string = yield signal1;
            return value.toUpperCase();
          };
          const state: StateValues = new Map([[signal1[SIGNAL], generator]]);
          expect(evaluate(root, state)).toEqual(
            EvaluationResult.Pending(
              ConditionTree.Unit({ condition: signal2 }),
              DependencyTree.Pair({
                left: DependencyTree.Unit({ value: signal1[SIGNAL] }),
                right: DependencyTree.Unit({ value: signal2[SIGNAL] }),
              }),
            ),
          );
        });

        test('fully resolved dependencies', () => {
          const signal1 = createEffect('effect:foo', null);
          const signal2 = createEffect('effect:bar', null);
          const generator: Stateful<string> = function* () {
            const value = yield signal2;
            return `-> ${value}`;
          };
          const root: Stateful<string> = function* (): StatefulGenerator<string> {
            const value: string = yield signal1;
            return value.toUpperCase();
          };
          const state: StateValues = new Map<StateToken, Reactive<string>>([
            [signal1[SIGNAL], generator],
            [signal2[SIGNAL], 'foo'],
          ]);
          expect(evaluate(root, state)).toEqual(
            EvaluationResult.Ready(
              '-> FOO',
              DependencyTree.Pair({
                left: DependencyTree.Unit({ value: signal1[SIGNAL] }),
                right: DependencyTree.Unit({ value: signal2[SIGNAL] }),
              }),
            ),
          );
        });
      });
    });
  });
});
