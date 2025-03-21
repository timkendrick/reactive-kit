import type { Predicate } from '../types';

export function not<T>(predicate: Predicate<T>): Predicate<T> {
  return (value: T) => !predicate(value);
}
