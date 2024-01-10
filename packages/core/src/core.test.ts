import { describe, expect, test } from 'vitest';
import { ConditionTree, SIGNAL } from '@trigger/types';
import { once } from './signal';
import { flattenConditionTree } from './core';

describe(flattenConditionTree, () => {
  test('unit', () => {
    const foo = once('foo');
    const tree = ConditionTree.Unit({ condition: foo });
    expect(flattenConditionTree(tree)).toEqual(new Map([[foo[SIGNAL], foo]]));
  });

  test('pair', () => {
    const foo = once('foo');
    const bar = once('bar');
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
    const foo = once('foo');
    const bar = once('bar');
    const baz = once('baz');
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
