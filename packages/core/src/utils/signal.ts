import { SIGNAL, SignalType, type Signal, type StateToken } from '@trigger/types';
import { Hashable, hash } from './hash';

export function createSignal<T, V extends Hashable>(type: SignalType, value: V): Signal<T>;
export function createSignal<T>(id: StateToken, type: SignalType, value: any): Signal<T>;
export function createSignal<T>(
  id: StateToken | SignalType,
  type: SignalType | any,
  value?: any,
): Signal<T> {
  if (typeof id === 'string') return createSignal(hash(id, type), id, type);
  return {
    [SIGNAL]: id,
    type,
    value,
  };
}
