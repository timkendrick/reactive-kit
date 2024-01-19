import { Effect } from '@trigger/types';
import { createEffect, Hashable } from '../utils';

export const EFFECT_TYPE_VARIABLE_GET = '@trigger::variable::get';
export const EFFECT_TYPE_VARIABLE_SET = '@trigger::variable::set';

export type VariableId = string;

export interface VariableGetEffect extends Effect<typeof EFFECT_TYPE_VARIABLE_GET, VariableId> {}
export interface VariableSetEffect<T extends Hashable>
  extends Effect<typeof EFFECT_TYPE_VARIABLE_SET, [VariableId, T]> {}

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
