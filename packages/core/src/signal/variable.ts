import { Signal } from '@trigger/types';
import { createSignal, Hashable } from '../utils';

export function variable<T extends Hashable>(uid: string): [Signal<T>, (value: T) => Signal<T>] {
  return [getVariable(uid), setVariable.bind(null, uid)];
}

export function getVariable<T>(uid: string): Signal<T> {
  return createSignal('@trigger::get', uid);
}

export function setVariable<T extends Hashable>(uid: string, value: T): Signal<T> {
  return createSignal('@trigger::set', [uid, value]);
}
