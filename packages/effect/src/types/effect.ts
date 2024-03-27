import type { Hashable, CustomHashable } from '@reactive-kit/utils';

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
