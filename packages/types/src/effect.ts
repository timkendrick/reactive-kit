import type { HASH, Hashable } from './hash';
import type { StateToken } from './state';

export const EFFECT = Symbol.for('@trigger::effect');

export type EffectType = string;

export interface Effect<T extends EffectType = EffectType, P extends Hashable = Hashable> {
  [EFFECT]: StateToken;
  type: T;
  payload: P;
  [HASH](state: bigint): bigint;
}

export function isEffect(value: unknown): value is Effect {
  return value != null && typeof value === 'object' && EFFECT in value;
}
