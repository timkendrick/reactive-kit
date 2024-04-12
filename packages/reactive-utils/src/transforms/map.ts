import { HASH, hash, type CustomHashable } from '@reactive-kit/hash';
import type { Effect, Reactive, Stateful } from '@reactive-kit/types';

export function map<T, V>(
  expression: Effect | Stateful<T>,
  transform: ((result: T) => V) & CustomHashable,
): Reactive<V> {
  return {
    [HASH]: hash('@reactive-kit/transform/map', expression, transform),
    [Symbol.iterator]: function* () {
      const value = (yield expression) as T;
      return transform(value);
    },
  };
}
