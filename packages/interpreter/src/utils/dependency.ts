import { type StateToken } from '@reactive-kit/effect';
import { VARIANT } from '@reactive-kit/utils';
import { DependencyTree, EvaluationResult, EvaluationResultType } from '../types';

export const EMPTY_DEPENDENCIES = DependencyTree.Empty({});

export function combineDependencies(left: DependencyTree, right: DependencyTree): DependencyTree {
  if (DependencyTree.Empty.is(right)) return left;
  if (DependencyTree.Empty.is(left)) return right;
  return DependencyTree.Pair({ left, right });
}

export function withDependencies<T>(
  dependencies: DependencyTree,
  result: EvaluationResult<T>,
): EvaluationResult<T> {
  const combinedDependencies = combineDependencies(dependencies, result.dependencies);
  switch (result[VARIANT]) {
    case EvaluationResultType.Pending: {
      const { conditions } = result;
      return EvaluationResult.Pending(conditions, combinedDependencies);
    }
    case EvaluationResultType.Ready: {
      const { value } = result;
      return EvaluationResult.Ready(value, combinedDependencies);
    }
  }
}

export function flattenDependencyTree(tree: DependencyTree): Set<StateToken> {
  const queue = [tree];
  const results = new Set<StateToken>();
  let item: DependencyTree | undefined;
  while ((item = queue.pop())) {
    switch (item[VARIANT]) {
      case DependencyTree.Empty[VARIANT]: {
        continue;
      }
      case DependencyTree.Unit[VARIANT]: {
        results.add(item.value);
        continue;
      }
      case DependencyTree.Pair[VARIANT]: {
        queue.push(item.left, item.right);
        continue;
      }
      case DependencyTree.Multiple[VARIANT]: {
        queue.push(...item.children);
        continue;
      }
    }
  }
  return results;
}
