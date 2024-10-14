import { createEffect, type Effect } from '@reactive-kit/types';

export const EFFECT_TYPE_TIME = '@reactive-kit/effect-time';

export interface TimeEffect extends Effect<Date> {
  type: TimeEffectType;
  payload: TimeEffectPayload;
}

export type TimeEffectType = typeof EFFECT_TYPE_TIME;

export type TimeEffectPayload = number;

export interface TimeHeaders extends Record<string, string> {}

export function createTimeEffect(interval: number): TimeEffect {
  return createEffect(EFFECT_TYPE_TIME, interval);
}

export function isTimeEffect(error: Effect<unknown>): error is TimeEffect {
  return error.type === EFFECT_TYPE_TIME;
}
