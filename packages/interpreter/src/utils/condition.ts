import { EFFECT, StateToken, type Effect } from '@reactive-kit/types';
import { VARIANT } from '@reactive-kit/utils';
import { ConditionTree } from '../types';

export function createEffectLookup(tree: ConditionTree): Map<StateToken, Effect<unknown>> {
  const queue = [tree];
  const results = new Map<StateToken, Effect<unknown>>();
  let item: ConditionTree | undefined;
  while ((item = queue.pop())) {
    switch (item[VARIANT]) {
      case ConditionTree.Unit[VARIANT]: {
        const { condition: effect } = item;
        results.set(effect[EFFECT], effect);
        continue;
      }
      case ConditionTree.Pair[VARIANT]: {
        queue.push(item.right, item.left);
        continue;
      }
      case ConditionTree.Multiple[VARIANT]: {
        for (let i = item.children.length - 1; i >= 0; i--) {
          queue.push(item.children[i]);
        }
        continue;
      }
    }
  }
  return results;
}

export function flattenConditionTree(
  tree: ConditionTree,
): [Effect<unknown>, ...Array<Effect<unknown>>] {
  return Array.from(createEffectLookup(tree).values()) as [
    Effect<unknown>,
    ...Array<Effect<unknown>>,
  ];
}

export function collectConditionTree(
  conditions: [Effect<unknown>, ...Array<Effect<unknown>>],
): ConditionTree;
export function collectConditionTree(conditions: Array<Effect<unknown>>): ConditionTree | null;
export function collectConditionTree(conditions: Array<Effect<unknown>>): ConditionTree | null {
  switch (conditions.length) {
    case 0:
      return null;
    case 1:
      return ConditionTree.Unit({ condition: conditions[0] });
    default:
      return ConditionTree.Multiple({
        children: conditions.map((condition) => ConditionTree.Unit({ condition })),
      });
  }
}
