import { createEffect, type EffectExpression } from '@reactive-kit/types';

import type { StateId } from '../types';

export const EFFECT_TYPE_GET_STATE = '@reactive-kit/effect-state/get';

export interface GetStateEffect<T> extends EffectExpression<T> {
  type: GetStateEffectType;
  payload: GetStateEffectPayload;
}

export type GetStateEffectType = typeof EFFECT_TYPE_GET_STATE;

export type GetStateEffectPayload = StateId;

export function createGetStateEffect<T>(uid: string): GetStateEffect<T> {
  return createEffect(EFFECT_TYPE_GET_STATE, uid);
}

export function isGetStateEffect(
  error: EffectExpression<unknown>,
): error is GetStateEffect<unknown> {
  return error.type === EFFECT_TYPE_GET_STATE;
}
