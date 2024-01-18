import { describe, expect, test } from 'vitest';
import { ConditionTree, SIGNAL } from '@trigger/types';
import { flattenConditionTree } from './condition';
import { createSignal } from './signal';

describe(flattenConditionTree, () => {
  test('unit', () => {
    const foo = createSignal('effect:foo', null);
    const tree = ConditionTree.Unit({ condition: foo });
    expect(flattenConditionTree(tree)).toEqual(new Map([[foo[SIGNAL], foo]]));
  });

  test('pair', () => {
    const foo = createSignal('effect:foo', null);
    const bar = createSignal('effect:bar', null);
    const tree = ConditionTree.Pair({
      left: ConditionTree.Unit({ condition: foo }),
      right: ConditionTree.Unit({ condition: bar }),
    });
    expect(flattenConditionTree(tree)).toEqual(
      new Map([
        [foo[SIGNAL], foo],
        [bar[SIGNAL], bar],
      ]),
    );
  });

  test('multiple', () => {
    const foo = createSignal('effect:foo', null);
    const bar = createSignal('effect:bar', null);
    const baz = createSignal('effect:baz', null);
    const tree = ConditionTree.Multiple({
      children: [
        ConditionTree.Unit({ condition: foo }),
        ConditionTree.Unit({ condition: bar }),
        ConditionTree.Unit({ condition: baz }),
      ],
    });
    expect(flattenConditionTree(tree)).toEqual(
      new Map([
        [foo[SIGNAL], foo],
        [bar[SIGNAL], bar],
        [baz[SIGNAL], baz],
      ]),
    );
  });
});
