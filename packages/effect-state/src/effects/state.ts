import { createEffect, type Effect } from '@reactive-kit/effect';
import { type StateId } from '../types';

export const EFFECT_TYPE_STATE = '@reactive-kit/effect-state';

export interface StateEffect extends Effect<StateEffectType, StateEffectPayload> {}

export type StateEffectType = typeof EFFECT_TYPE_STATE;

export type StateEffectPayload = StateId;

export function createStateEffect(uid: string): StateEffect {
  return createEffect(EFFECT_TYPE_STATE, uid);
}
