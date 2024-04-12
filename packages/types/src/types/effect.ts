import { hash, HASH, type Hashable, type CustomHashable } from '@reactive-kit/hash';

export type StateToken = bigint;

export const EFFECT = Symbol.for('@reactive-kit/symbols/effect');

export type EffectType = string;

export interface Effect<T extends EffectType = EffectType, P extends Hashable = Hashable>
  extends CustomHashable {
  [EFFECT]: StateToken;
  type: T;
  payload: P;
}

export function isEffect(value: unknown): value is Effect {
  return value != null && typeof value === 'object' && EFFECT in value;
}

export function createEffect<T extends EffectType, P extends Hashable>(
  type: T,
  payload: P,
): Effect<T, P>;
export function createEffect<T extends EffectType, P extends Hashable>(
  id: StateToken,
  type: T,
  payload: P,
): Effect<T, P>;
export function createEffect<T extends EffectType, P extends Hashable>(
  id: StateToken | T,
  type: T | P,
  payload?: P,
): Effect<T, P> {
  if (typeof id === 'string') return createEffect(hash(id, type as Hashable), id as T, type as P);
  return {
    [HASH]: id,
    [EFFECT]: id,
    type: type as T,
    payload: payload as P,
  };
}
