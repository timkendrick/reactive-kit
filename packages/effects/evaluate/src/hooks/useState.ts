import { createEffect, type Effect } from '@reactive-kit/effect';
import { type Hashable } from '@reactive-kit/utils';

export const EFFECT_TYPE_GET_STATE = 'core::state::get';
export const EFFECT_TYPE_SET_STATE = 'core::state::set';

export type StateId = string;

export interface GetStateEffect extends Effect<GetStateEffectType, GetStateEffectPayload> {}

export type GetStateEffectType = typeof EFFECT_TYPE_GET_STATE;

export type GetStateEffectPayload = StateId;

export interface SetStateEffect<T extends Hashable>
  extends Effect<SetStateEffectType, SetStateEffectPayload<T>> {}

export type SetStateEffectType = typeof EFFECT_TYPE_SET_STATE;

export type SetStateEffectPayload<T extends Hashable> = [StateId, T];

export function useState<T extends Hashable>(
  uid: StateId,
): [GetStateEffect, (value: T) => SetStateEffect<T>] {
  return [useGetState(uid), set];

  function set(value: T): SetStateEffect<T> {
    return useSetState(uid, value);
  }
}

export function useGetState(uid: string): GetStateEffect {
  return createEffect(EFFECT_TYPE_GET_STATE, uid);
}

export function useSetState<T extends Hashable>(uid: string, value: T): SetStateEffect<T> {
  return createEffect(EFFECT_TYPE_SET_STATE, [uid, value]);
}
