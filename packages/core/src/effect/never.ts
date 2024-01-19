import { type Effect } from '@trigger/types';
import { createEffect } from '../utils';

export const EFFECT_TYPE_NEVER = 'core::never';

export interface NeverEffect extends Effect<NeverEffectType, NeverEffectPayload> {}

export type NeverEffectType = typeof EFFECT_TYPE_NEVER;

export type NeverEffectPayload = null;

export function never(): NeverEffect {
  return createEffect(EFFECT_TYPE_NEVER, null);
}
