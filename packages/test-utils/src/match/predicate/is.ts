import type { Predicate } from '../types';

export function is<T>(value: T): Predicate<T> {
  return (item: T) => item === value;
}
