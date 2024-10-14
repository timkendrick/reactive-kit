import { HASH, hash, Hash, Hashable, type CustomHashable } from '@reactive-kit/hash';
import type { Reactive } from './reactive';
import { Signal } from './signal';

const CATCHER_TYPE_ID = '@reactive-kit/symbols/catcher';
export const CATCHER = Symbol.for(CATCHER_TYPE_ID);

export type CatcherType = string;

export interface Catcher<T> extends CustomHashable {
  [CATCHER]: true;
  type: CatcherType;
  target: Reactive<T>;
  fallback: (condition: Signal) => Reactive<T> | Signal;
}

export function isCatcher(value: unknown): value is Catcher<unknown> {
  return value != null && typeof value === 'object' && CATCHER in value;
}

export function createCatcher<V extends Hashable, T extends CatcherType>(
  type: T,
  target: Reactive<V>,
  fallback: ((condition: Signal) => Reactive<V> | Signal) & Hashable,
): Catcher<V> & { type: T };
export function createCatcher<V, T extends CatcherType>(
  id: Hash,
  type: T,
  target: Reactive<V>,
  fallback: (condition: Signal) => Reactive<V> | Signal,
): Catcher<V> & { type: T };
export function createCatcher<V, T extends CatcherType>(
  idOrType: Hash | T,
  typeOrTarget: T | Reactive<V>,
  targetOrFallback?: Reactive<V> | (((condition: Signal) => Reactive<V> | Signal) & Hashable),
  maybeFallback?: (condition: Signal) => Reactive<V> | Signal,
): Catcher<V> & { type: T } {
  if (typeof idOrType === 'string') {
    const type = idOrType as T;
    const target = typeOrTarget as Reactive<V & Hashable>;
    const fallback = targetOrFallback as ((condition: Signal) => Reactive<V & Hashable> | Signal) &
      Hashable;
    return createCatcher(hash(CATCHER_TYPE_ID, type, target, fallback), type, target, fallback);
  }
  const id = idOrType as Hash;
  const type = typeOrTarget as T;
  const target = targetOrFallback as Reactive<V>;
  const fallback = maybeFallback as (condition: Signal) => Reactive<V> | Signal;
  return {
    [HASH]: id,
    [CATCHER]: true,
    type,
    target,
    fallback,
  };
}
