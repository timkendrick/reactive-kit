import { HASH, createHasher } from '@reactive-kit/utils';
import { type StateToken } from '@reactive-kit/effect';
import { STATEFUL, type Stateful, type StatefulIteratorFactory } from '../types';

export function createStatefulGenerator<T>(
  hash: StateToken,
  generator: StatefulIteratorFactory<T>,
): Stateful<T> {
  return {
    [STATEFUL]: generator,
    [HASH]: createHasher(hash),
  };
}
