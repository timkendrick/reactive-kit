import { Predicate } from '../types';

export function any<T>(): Predicate<T> {
  return (item) => true;
}
