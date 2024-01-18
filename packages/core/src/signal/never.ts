import { Signal } from '@trigger/types';
import { createSignal } from '../utils';

export function never<T>(): Signal<T> {
  return createSignal('@trigger::never', null);
}
