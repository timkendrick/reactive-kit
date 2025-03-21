import { deepEqual } from '@reactive-kit/utils';

import type { Predicate } from '../types';

export function equals<T>(value: T): Predicate<T> {
  return (item: T) => deepEqual(item, value);
}
