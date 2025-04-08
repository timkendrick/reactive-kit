import type { Predicate } from '../types';

export function or<T>(...predicates: Array<Predicate<T>>): Predicate<T> {
  return (value: T) => predicates.some((matcher) => matcher(value));
}
