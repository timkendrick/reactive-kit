import type { Hashable } from '@reactive-kit/hash';
import { createEffect, type EffectExpression } from '@reactive-kit/types';

import type { StateId } from '../types';

export const EFFECT_TYPE_SET_STATE = '@reactive-kit/effect-state/set';

export interface SetStateEffect<T> extends EffectExpression<null> {
  type: SetStateEffectType;
  payload: SetStateEffectPayload<T>;
}

export type SetStateEffectType = typeof EFFECT_TYPE_SET_STATE;

export type SetStateEffectPayload<T> = [StateId, T];

export function createSetStateEffect<T extends Hashable>(uid: string, value: T): SetStateEffect<T> {
  return createEffect(EFFECT_TYPE_SET_STATE, [uid, value]);
}

export function isSetStateEffect(
  error: EffectExpression<unknown>,
): error is SetStateEffect<unknown> {
  return error.type === EFFECT_TYPE_SET_STATE;
}
