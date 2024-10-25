import type { DependencyGraph, DependencyGraphNode } from '@reactive-kit/cache';
import type { Hash } from '@reactive-kit/hash';
import type { EvaluationResult, Expression } from '@reactive-kit/types';

export type EvaluationCache = DependencyGraph<Hash, EvaluationCacheValue<any>>;
export type EvaluationCacheNode<T> = DependencyGraphNode<EvaluationCacheValue<T>>;

export interface EvaluationCacheValue<T> {
  id: Hash;
  expression: Expression<T>;
  result: EvaluationResult<T>;
}
