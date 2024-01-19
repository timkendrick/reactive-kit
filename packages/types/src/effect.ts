import type { StateToken } from './state';

export const SIGNAL = Symbol.for('@trigger::signal');

export type EffectType = string;

export interface Effect<TType extends EffectType = EffectType, TData = unknown> {
  [SIGNAL]: StateToken;
  type: TType;
  data: TData;
}

export function isEffect(value: unknown): value is Effect {
  return value != null && typeof value === 'object' && SIGNAL in value;
}
