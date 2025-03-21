import type { Predicate } from '../types';

export function and<T>(...predicates: Array<Predicate<T>>): Predicate<T> {
  return (value: T) => predicates.every((matcher) => matcher(value));
}
