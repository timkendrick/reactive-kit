import { ConditionTree, EFFECT, type Effect, type StateToken } from '@trigger/types';
import { VARIANT } from '@trigger/utils';

export function flattenConditionTree(tree: ConditionTree): Map<StateToken, Effect> {
  const queue = [tree];
  const results = new Map<StateToken, Effect>();
  let item: ConditionTree | undefined;
  while ((item = queue.pop())) {
    switch (item[VARIANT]) {
      case ConditionTree.Unit[VARIANT]: {
        results.set(item.condition[EFFECT], item.condition);
        continue;
      }
      case ConditionTree.Pair[VARIANT]: {
        queue.push(item.left, item.right);
        continue;
      }
      case ConditionTree.Multiple[VARIANT]: {
        queue.push(...item.children);
        continue;
      }
    }
  }
  return results;
}

export function collectConditionTree(conditions: Array<Effect>): ConditionTree | null {
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
