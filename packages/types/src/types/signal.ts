import { hash, HASH, type CustomHashable } from '@reactive-kit/hash';
import { type Effect } from './effect';

const SIGNAL_TYPE_ID = '@reactive-kit/symbols/signal';
export const SIGNAL = Symbol.for(SIGNAL_TYPE_ID);

export interface Signal extends CustomHashable {
  [SIGNAL]: true;
  effects: [Effect<unknown>, ...Array<Effect<unknown>>];
}

export function isSignal(value: unknown): value is Signal {
  return value != null && typeof value === 'object' && SIGNAL in value;
}

export function createSignal(effects: [Effect<unknown>, ...Array<Effect<unknown>>]): Signal {
  return {
    [HASH]: hash(SIGNAL_TYPE_ID, effects),
    [SIGNAL]: true,
    effects,
  };
}
