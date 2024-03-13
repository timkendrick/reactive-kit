import { createEffect, type Effect } from '@reactive-kit/effect';

export const EFFECT_TYPE_NEVER = 'core::never';

export interface NeverEffect extends Effect<NeverEffectType, NeverEffectPayload> {}

export type NeverEffectType = typeof EFFECT_TYPE_NEVER;

export type NeverEffectPayload = null;

export function useNever(): NeverEffect {
  return createEffect(EFFECT_TYPE_NEVER, null);
}
