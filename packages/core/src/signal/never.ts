import { Effect } from '@trigger/types';
import { createEffect } from '../utils';

export const EFFECT_TYPE_NEVER = '@trigger::never';

export interface NeverEffect extends Effect<typeof EFFECT_TYPE_NEVER, null> {}

export function never(): NeverEffect {
  return createEffect(EFFECT_TYPE_NEVER, null);
}
