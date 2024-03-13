import { createEffect, EFFECT, type Effect, type StateToken } from '@reactive-kit/effect';
import { describe, expect, test } from 'vitest';
import { ConditionTree } from '../types';
import { flattenConditionTree } from './condition';

describe(flattenConditionTree, () => {
  test('unit', () => {
    const foo = createEffect('effect:foo', null);
    const tree = ConditionTree.Unit({ condition: foo });
    expect(flattenConditionTree(tree)).toEqual(new Map<StateToken, Effect>([[foo[EFFECT], foo]]));
  });

  test('pair', () => {
    const foo = createEffect('effect:foo', null);
    const bar = createEffect('effect:bar', null);
    const tree = ConditionTree.Pair({
      left: ConditionTree.Unit({ condition: foo }),
      right: ConditionTree.Unit({ condition: bar }),
    });
    expect(flattenConditionTree(tree)).toEqual(
      new Map<StateToken, Effect>([
        [foo[EFFECT], foo],
        [bar[EFFECT], bar],
      ]),
    );
  });

  test('multiple', () => {
    const foo = createEffect('effect:foo', null);
    const bar = createEffect('effect:bar', null);
    const baz = createEffect('effect:baz', null);
    const tree = ConditionTree.Multiple({
      children: [
        ConditionTree.Unit({ condition: foo }),
        ConditionTree.Unit({ condition: bar }),
        ConditionTree.Unit({ condition: baz }),
      ],
    });
    expect(flattenConditionTree(tree)).toEqual(
      new Map<StateToken, Effect>([
        [foo[EFFECT], foo],
        [bar[EFFECT], bar],
        [baz[EFFECT], baz],
      ]),
    );
  });
});
