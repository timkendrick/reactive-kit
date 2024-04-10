import { createEffect, type Effect } from '@reactive-kit/effect';

export const EFFECT_TYPE_NEVER = '@reactive-kit/effect-never';

export interface NeverEffect extends Effect<NeverEffectType, NeverEffectPayload> {}

export type NeverEffectType = typeof EFFECT_TYPE_NEVER;

export type NeverEffectPayload = null;

export function createNeverEffect(): NeverEffect {
  return createEffect(EFFECT_TYPE_NEVER, null);
}
