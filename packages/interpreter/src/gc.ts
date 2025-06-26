import { hash, type Hash } from '@reactive-kit/hash';
import { isEffectExpression, type EffectExpression, type Expression } from '@reactive-kit/types';

import type { EvaluationCache, EvaluationCacheValue } from './types';

export function gc<T>(
  cache: EvaluationCache,
  roots: Array<Expression<T>>,
  options: { major: boolean },
): Set<EffectExpression<unknown>> {
  return options.major ? majorGc(cache, roots) : minorGc(cache, roots);
}

function majorGc<T>(
  cache: EvaluationCache,
  roots: Array<Expression<T>>,
): Set<EffectExpression<unknown>> {
  cache.advance();
  for (const root of roots) {
    const cacheEntry = cache.get(hash(root));
    if (cacheEntry != null) cache.visitAll(cacheEntry);
  }
  return cache.gc(isEvaluationCacheEffectResult, ({ expression }) => expression);
}

export function minorGc<T>(
  cache: EvaluationCache,
  roots: Array<Expression<T>>,
): Set<EffectExpression<unknown>> {
  const rootsByLastVisited = roots
    .map((root) => cache.get(hash(root)))
    .filter((value): value is NonNullable<typeof value> => value != null)
    .sort((a, b) => a.visited - b.visited);
  const results = new Set<EffectExpression<unknown>>();
  for (const root of rootsByLastVisited) {
    const unsubscribedEffects = cache.prune(
      root,
      getEvaluationCacheKey,
      isEvaluationCacheEffectResult,
      unwrapEvaluationCacheEffectResult,
    );
    for (const effect of unsubscribedEffects) {
      results.add(effect);
    }
  }
  return results;
}

function isEvaluationCacheEffectResult<T>(
  result: EvaluationCacheValue<T>,
): result is EvaluationCacheValue<T> & {
  expression: EffectExpression<T>;
} {
  return isEffectExpression(result.expression);
}

function unwrapEvaluationCacheEffectResult<T>(
  result: EvaluationCacheValue<T> & {
    expression: EffectExpression<T>;
  },
): EffectExpression<T> {
  return result.expression;
}

function getEvaluationCacheKey<T>(value: EvaluationCacheValue<T>): Hash {
  return value.id;
}
