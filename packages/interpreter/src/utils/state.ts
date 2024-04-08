import { HASH, type Hash } from '@reactive-kit/hash';
import { STATEFUL, type Stateful, type StatefulIteratorFactory } from '../types';

export function createStatefulGenerator<T>(
  hash: Hash,
  generator: StatefulIteratorFactory<T>,
): Stateful<T> {
  return {
    [HASH]: hash,
    [STATEFUL]: generator,
  };
}
