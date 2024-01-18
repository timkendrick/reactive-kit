import { type StateToken } from '@trigger/types';
import { Enum, VARIANT } from '@trigger/utils';

export const enum DependencyTreeType {
  Empty = 'Empty',
  Unit = 'Unit',
  Pair = 'Pair',
  Multiple = 'Multiple',
}

export type DependencyTree = Enum<{
  [DependencyTreeType.Empty]: void;
  [DependencyTreeType.Unit]: {
    value: StateToken;
  };
  [DependencyTreeType.Pair]: {
    left: DependencyTree;
    right: DependencyTree;
  };
  [DependencyTreeType.Multiple]: {
    children: Array<DependencyTree>;
  };
}>;

export const DependencyTree = Enum.create<DependencyTree>({
  [DependencyTreeType.Empty]: true,
  [DependencyTreeType.Unit]: true,
  [DependencyTreeType.Pair]: true,
  [DependencyTreeType.Multiple]: true,
});

export const EMPTY_DEPENDENCIES = DependencyTree.Empty({});

export function combineDependencies(left: DependencyTree, right: DependencyTree): DependencyTree {
  if (right[VARIANT] === 'Empty') return left;
  if (left[VARIANT] === 'Empty') return right;
  return DependencyTree.Pair({ left, right });
}

export function flattenDependencyTree(tree: DependencyTree): Set<StateToken> {
  const queue = [tree];
  const results = new Set<StateToken>();
  let item: DependencyTree | undefined;
  while ((item = queue.pop())) {
    switch (item[VARIANT]) {
      case DependencyTreeType.Empty: {
        continue;
      }
      case DependencyTreeType.Unit: {
        results.add(item.value);
        continue;
      }
      case DependencyTreeType.Pair: {
        queue.push(item.left, item.right);
        continue;
      }
      case DependencyTreeType.Multiple: {
        queue.push(...item.children);
        continue;
      }
    }
  }
  return results;
}
