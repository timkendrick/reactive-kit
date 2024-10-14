import { hash, HASH, type Hashable, type CustomHashable } from '@reactive-kit/hash';

export type StateToken = bigint;

const EFFECT_TYPE_ID = '@reactive-kit/symbols/effect';
export const EFFECT = Symbol.for(EFFECT_TYPE_ID);

export type EffectType = string;

declare const RESULT_TYPE: unique symbol;

export interface Effect<T> extends CustomHashable {
  [RESULT_TYPE]: T;
  [EFFECT]: StateToken;
  type: EffectType;
  payload: unknown;
}

export function isEffect(value: unknown): value is Effect<unknown> {
  return value != null && typeof value === 'object' && EFFECT in value;
}

export function createEffect<T extends EffectType, P extends Hashable, V>(
  type: T,
  payload: P,
): Effect<V> & { type: T; payload: P } {
  const id = hash(EFFECT_TYPE_ID, type, payload);
  return {
    [HASH]: id,
    [EFFECT]: id,
    type,
    payload,
  } satisfies Omit<
    Effect<V> & { type: T; payload: P },
    typeof RESULT_TYPE
  > as unknown as Effect<V> & { type: T; payload: P };
}
