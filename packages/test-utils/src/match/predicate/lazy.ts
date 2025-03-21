import type { Predicate } from '../types';

export function lazy<T>(predicate: Predicate<T>): Predicate<T> {
  return (value: T) => predicate(value);
}
