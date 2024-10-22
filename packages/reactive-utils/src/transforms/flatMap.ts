import { HASH, hash, type CustomHashable } from '@reactive-kit/hash';
import type { Effect, Reactive, Stateful } from '@reactive-kit/types';

export function flatMap<T, V>(
  expression: Effect<T> | Stateful<T>,
  transform: ((result: T) => Reactive<V>) & CustomHashable,
): Reactive<V> {
  return {
    [HASH]: hash('@reactive-kit/transform/flatMap', expression, transform),
    [Symbol.iterator]: function* () {
      const value = (yield expression) as T;
      const inner = transform(value);
      const result = (yield inner) as V;
      return result;
    },
  };
}
