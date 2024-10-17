import { HASH, hash, Hash, Hashable, type CustomHashable } from '@reactive-kit/hash';
import type { Reactive } from './reactive';

const FORK_TYPE_ID = '@reactive-kit/symbols/fork';
export const FORK = Symbol.for(FORK_TYPE_ID);

export interface Fork<T extends Array<unknown>> extends CustomHashable {
  [FORK]: true;
  expressions: Array<Reactive<T[number]>>;
}

export function isFork(value: unknown): value is Fork<Array<Reactive<unknown>>> {
  return value != null && typeof value === 'object' && FORK in value;
}

export function createFork<T extends Array<Reactive<unknown> & Hashable>>(expressions: T): Fork<T>;
export function createFork<T extends Array<Reactive<unknown>>>(id: Hash, expressions: T): Fork<T>;
export function createFork<V, T extends Array<Reactive<unknown> & Hashable>>(
  idOrExpressions: Hash | T,
  maybeExpressions?: T,
): Fork<T> {
  if (Array.isArray(idOrExpressions)) {
    const expressions = idOrExpressions as T;
    return createFork(hash(FORK_TYPE_ID, expressions), expressions);
  }
  const id = idOrExpressions as Hash;
  const expressions = maybeExpressions as T;
  return {
    [HASH]: id,
    [FORK]: true,
    expressions,
  };
}
