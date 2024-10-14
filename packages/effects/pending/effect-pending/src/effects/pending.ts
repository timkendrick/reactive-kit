import { createEffect, type Effect } from '@reactive-kit/types';

export const EFFECT_TYPE_PENDING = '@reactive-kit/effect-pending';

export interface PendingEffect extends Effect<never> {
  type: PendingEffectType;
  payload: PendingEffectPayload;
}

export type PendingEffectType = typeof EFFECT_TYPE_PENDING;

export type PendingEffectPayload = null;

export function createPendingEffect(): PendingEffect {
  return createEffect(EFFECT_TYPE_PENDING, null);
}

export function isPendingEffect(error: Effect<unknown>): error is PendingEffect {
  return error.type === EFFECT_TYPE_PENDING;
}
