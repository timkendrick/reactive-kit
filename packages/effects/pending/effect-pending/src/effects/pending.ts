import { createEffect, type Effect } from '@reactive-kit/types';

export const EFFECT_TYPE_PENDING = '@reactive-kit/effect-pending';

export interface PendingEffect extends Effect<PendingEffectType, PendingEffectPayload> {}

export type PendingEffectType = typeof EFFECT_TYPE_PENDING;

export type PendingEffectPayload = null;

export function createPendingEffect(): PendingEffect {
  return createEffect(EFFECT_TYPE_PENDING, null);
}
