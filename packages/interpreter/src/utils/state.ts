import { HASH, type Hash } from '@reactive-kit/hash';
import { type Stateful, type StatefulGeneratorFactory } from '../types';
import { isGeneratorFunction } from '@reactive-kit/utils';

export function createStatefulGenerator<T>(
  hash: Hash,
  generator: StatefulGeneratorFactory<T>,
): Stateful<T> {
  return {
    [HASH]: hash,
    [Symbol.iterator]: isGeneratorFunction(generator)
      ? generator
      : function* () {
          return yield* generator();
        },
  };
}
