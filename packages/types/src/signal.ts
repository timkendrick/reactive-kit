import type { StateToken } from './state';

export const SIGNAL = Symbol.for('@trigger::signal');

export type SignalType = string;

export interface Signal<T = unknown> {
  [SIGNAL]: StateToken;
  type: SignalType;
  value: any;
}

export function isSignal(value: unknown): value is Signal<unknown> {
  return value != null && typeof value === 'object' && SIGNAL in value;
}
