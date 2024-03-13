import type { HASH, Hashable } from '@reactive-kit/utils';

export type StateToken = bigint;

export const EFFECT = Symbol.for('@reactive-kit::effect');

export type EffectType = string;

export interface Effect<T extends EffectType = EffectType, P extends Hashable = Hashable> {
  [EFFECT]: StateToken;
  [HASH](state: bigint): bigint;
  type: T;
  payload: P;
}

export function isEffect(value: unknown): value is Effect {
  return value != null && typeof value === 'object' && EFFECT in value;
}
