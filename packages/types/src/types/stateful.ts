import { type CustomHashable, HASH, type Hash } from '@reactive-kit/hash';
import { isGeneratorFunction } from '@reactive-kit/utils';
import type { Reactive } from './reactive';

export interface Stateful<T> extends CustomHashable {
  [Symbol.iterator]: StatefulGeneratorFactory<T>;
}

export interface StatefulGeneratorFactory<T> {
  (): StatefulGenerator<T>;
}
export type StatefulGenerator<T> = Generator<
  StatefulGeneratorYieldValue,
  StatefulGeneratorReturnValue<T>,
  StatefulGeneratorNextValue
>;
export type StatefulGeneratorResult<T> = IteratorResult<
  StatefulGeneratorYieldValue,
  StatefulGeneratorReturnValue<T>
>;
export type StatefulGeneratorYieldValue = Reactive<unknown>;
export type StatefulGeneratorReturnValue<T> = T;
export type StatefulGeneratorNextValue = any;

export function isStateful(value: unknown): value is Stateful<unknown> {
  return (
    value != null &&
    typeof value === 'object' &&
    Symbol.iterator in value &&
    isGeneratorFunction(value[Symbol.iterator])
  );
}

export function createStateful<T>(hash: Hash, generator: StatefulGeneratorFactory<T>): Stateful<T> {
  return {
    [HASH]: hash,
    [Symbol.iterator]: isGeneratorFunction(generator)
      ? generator
      : function* () {
          return yield* generator();
        },
  };
}
