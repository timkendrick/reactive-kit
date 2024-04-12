import { createEffect, type Effect } from '@reactive-kit/types';

export const EFFECT_TYPE_TIME = '@reactive-kit/effect-time';

export interface TimeEffect extends Effect<TimeEffectType, TimeEffectPayload> {}

export type TimeEffectType = typeof EFFECT_TYPE_TIME;

export type TimeEffectPayload = number;

export interface TimeHeaders extends Record<string, string> {}

export function createTimeEffect(interval: number): TimeEffect {
  return createEffect(EFFECT_TYPE_TIME, interval);
}
