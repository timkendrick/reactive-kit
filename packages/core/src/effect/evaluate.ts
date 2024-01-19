import { HashableObject, type Effect, type Hashable, type Reactive } from '@trigger/types';
import { createEffect } from '../utils';

export const EFFECT_TYPE_EVALUATE = 'core::evaluate';

export interface EvaluateEffect extends Effect<EvaluateEffectType, EvaluateEffectPayload> {}

export type EvaluateEffectType = typeof EFFECT_TYPE_EVALUATE;

export type EvaluateEffectPayload = HashableObject<{
  expression: Reactive<Hashable>;
}>;

export function evaluate(expression: Reactive<Hashable>): EvaluateEffect {
  return createEffect(EFFECT_TYPE_EVALUATE, { expression });
}
