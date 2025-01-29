import { useReactive } from '@reactive-kit/reactive-utils';
import { type Hashable } from '@reactive-kit/hash';
import { createFallback, wrapExpression, type Expression } from '@reactive-kit/types';

export function useFallback<T, V extends Hashable>(
  fallback: (() => Expression<V>) & Hashable,
  value: Expression<T>,
): Promise<T | V> {
  return useReactive<T | V>(createFallback(value, wrapExpression(fallback())) as Expression<T | V>);
}
