import { type HashableObject, type Hashable } from '@reactive-kit/hash';
import { createEffect, type Effect, type Reactive } from '@reactive-kit/types';

export const EFFECT_TYPE_EVALUATE = '@reactive-kit/effect-evaluate';

export interface EvaluateEffect<T> extends Effect<T> {
  type: EvaluateEffectType;
  payload: EvaluateEffectPayload;
}

export type EvaluateEffectType = typeof EFFECT_TYPE_EVALUATE;

export type EvaluateEffectPayload = HashableObject<{
  expression: Reactive<Hashable>;
}>;

export function createEvaluateEffect<T extends Hashable>(
  expression: Reactive<T>,
): EvaluateEffect<T> {
  return createEffect(EFFECT_TYPE_EVALUATE, { expression });
}

export function isEvaluateEffect(error: Effect<unknown>): error is EvaluateEffect<unknown> {
  return error.type === EFFECT_TYPE_EVALUATE;
}
