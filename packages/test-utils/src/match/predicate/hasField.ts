import type { Predicate } from '../types';

export function hasField<T extends object, K extends keyof T>(
  field: K,
  predicate: Predicate<T[K]>,
): Predicate<T> {
  return (value) => predicate(value[field]);
}
