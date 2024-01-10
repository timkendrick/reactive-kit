import {
  ConditionTree,
  ConditionTreeType,
  DependencyTree,
  SIGNAL,
  type Signal,
  type StateToken,
} from '@trigger/types';
import { VARIANT } from '../../utils/lib';

export const EMPTY_DEPENDENCIES = DependencyTree.Empty({});

export function combineDependencies(left: DependencyTree, right: DependencyTree): DependencyTree {
  if (right[VARIANT] === 'Empty') return left;
  if (left[VARIANT] === 'Empty') return right;
  return DependencyTree.Pair({ left, right });
}

export function flattenConditionTree(tree: ConditionTree): Map<StateToken, Signal<unknown>> {
  const queue = [tree];
  const results = new Map<StateToken, Signal<unknown>>();
  let item: ConditionTree | undefined;
  while ((item = queue.pop())) {
    switch (item[VARIANT]) {
      case ConditionTreeType.Unit: {
        results.set(item.condition[SIGNAL], item.condition);
        continue;
      }
      case ConditionTreeType.Pair: {
        queue.push(item.left, item.right);
        continue;
      }
      case ConditionTreeType.Multiple: {
        queue.push(...item.children);
        continue;
      }
    }
  }
  return results;
}
