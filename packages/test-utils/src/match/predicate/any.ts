import type { Predicate } from '../types';

export function any<T>(): Predicate<T> {
  return (_item: unknown) => true;
}
