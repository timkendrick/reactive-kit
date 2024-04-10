import { createEffect, type Effect } from '@reactive-kit/effect';
import { type HashableObject, type Hashable } from '@reactive-kit/hash';
import { type Reactive } from '@reactive-kit/interpreter';

export const EFFECT_TYPE_EVALUATE = '@reactive-kit/effect-evaluate';

export interface EvaluateEffect extends Effect<EvaluateEffectType, EvaluateEffectPayload> {}

export type EvaluateEffectType = typeof EFFECT_TYPE_EVALUATE;

export type EvaluateEffectPayload = HashableObject<{
  expression: Reactive<Hashable>;
}>;

export function createEvaluateEffect(expression: Reactive<Hashable>): EvaluateEffect {
  return createEffect(EFFECT_TYPE_EVALUATE, { expression });
}
