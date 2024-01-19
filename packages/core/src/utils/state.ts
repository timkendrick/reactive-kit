import { HASH, STATEFUL, StateToken, Stateful, StatefulIteratorFactory } from '@trigger/types';
import { createHasher } from './hash';

export function createStatefulGenerator<T>(
  hash: StateToken,
  generator: StatefulIteratorFactory<T>,
): Stateful<T> {
  return {
    [STATEFUL]: generator,
    [HASH]: createHasher(hash),
  };
}
