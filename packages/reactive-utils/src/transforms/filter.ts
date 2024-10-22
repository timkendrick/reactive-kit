import { HASH, hash, type CustomHashable } from '@reactive-kit/hash';
import type { Effect, Reactive, Stateful } from '@reactive-kit/types';

export function filter<T, V extends T>(
  expression: Effect<T> | Stateful<T>,
  predicate: ((result: T) => result is V) & CustomHashable,
): Reactive<V>;
export function filter<T>(
  expression: Effect<T> | Stateful<T>,
  predicate: ((result: T) => boolean) & CustomHashable,
): Reactive<T>;
export function filter<T>(
  expression: Effect<T> | Stateful<T>,
  predicate: ((result: T) => boolean) & CustomHashable,
): Reactive<T> {
  return {
    [HASH]: hash('@reactive-kit/transform/filter', expression, predicate),
    [Symbol.iterator]: function* () {
      while (true) {
        const value = (yield expression) as T;
        if (value == null) continue;
        return value;
      }
    },
  };
}
