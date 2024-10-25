import { createEffect, type EffectExpression } from '@reactive-kit/types';
import { type StateId } from '../types';

export const EFFECT_TYPE_STATE = '@reactive-kit/effect-state';

export interface StateEffect<T> extends EffectExpression<T> {
  type: StateEffectType;
  payload: StateEffectPayload;
}

export type StateEffectType = typeof EFFECT_TYPE_STATE;

export type StateEffectPayload = StateId;

export function createStateEffect<T = unknown>(uid: string): StateEffect<T> {
  return createEffect(EFFECT_TYPE_STATE, uid);
}

export function isStateEffect(error: EffectExpression<unknown>): error is StateEffect<unknown> {
  return error.type === EFFECT_TYPE_STATE;
}
