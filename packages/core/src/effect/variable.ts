import { type Effect, type Hashable } from '@trigger/types';
import { createEffect } from '../utils';

export const EFFECT_TYPE_VARIABLE_GET = 'core::variable::get';
export const EFFECT_TYPE_VARIABLE_SET = 'core::variable::set';

export type VariableId = string;

export interface VariableGetEffect
  extends Effect<VariableGetEffectType, VariableGetEffectPayload> {}

export type VariableGetEffectType = typeof EFFECT_TYPE_VARIABLE_GET;

export type VariableGetEffectPayload = VariableId;

export interface VariableSetEffect<T extends Hashable>
  extends Effect<VariableSetEffectType, VariableSetEffectPayload<T>> {}

export type VariableSetEffectType = typeof EFFECT_TYPE_VARIABLE_SET;

export type VariableSetEffectPayload<T extends Hashable> = [VariableId, T];

export function variable<T extends Hashable>(
  uid: VariableId,
): [VariableGetEffect, (value: T) => VariableSetEffect<T>] {
  return [getVariable(uid), set];

  function set(value: T): VariableSetEffect<T> {
    return setVariable(uid, value);
  }
}

export function getVariable(uid: string): VariableGetEffect {
  return createEffect(EFFECT_TYPE_VARIABLE_GET, uid);
}

export function setVariable<T extends Hashable>(uid: string, value: T): VariableSetEffect<T> {
  return createEffect(EFFECT_TYPE_VARIABLE_SET, [uid, value]);
}
