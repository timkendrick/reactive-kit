import { createEffect, type Effect } from '@reactive-kit/types';
import { type StateId } from '../types';

export const EFFECT_TYPE_GET_STATE = '@reactive-kit/effect-state/get';

export interface GetStateEffect extends Effect<GetStateEffectType, GetStateEffectPayload> {}

export type GetStateEffectType = typeof EFFECT_TYPE_GET_STATE;

export type GetStateEffectPayload = StateId;

export function createGetStateEffect(uid: string): GetStateEffect {
  return createEffect(EFFECT_TYPE_GET_STATE, uid);
}
