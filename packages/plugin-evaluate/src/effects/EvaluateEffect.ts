import type { Hashable, HashableObject } from '@reactive-kit/hash';
import { createEffect, type EffectExpression, type Expression } from '@reactive-kit/types';

export const EFFECT_TYPE_EVALUATE = '@reactive-kit/effect-evaluate';

export interface EvaluateEffect<T> extends EffectExpression<T> {
  type: EvaluateEffectType;
  payload: EvaluateEffectPayload<T>;
}

export type EvaluateEffectType = typeof EFFECT_TYPE_EVALUATE;

export type EvaluateEffectPayload<T> = HashableObject<{
  expression: Expression<T> & Hashable;
}>;

export function createEvaluateEffect<T>(expression: Expression<T> & Hashable): EvaluateEffect<T> {
  return createEffect(EFFECT_TYPE_EVALUATE, { expression });
}

export function isEvaluateEffect(
  error: EffectExpression<unknown>,
): error is EvaluateEffect<unknown> {
  return error.type === EFFECT_TYPE_EVALUATE;
}
