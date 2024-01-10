import { Enum, EnumVariant, VARIANT, instantiateEnum, noop } from '@trigger/utils';
import type { Reactive } from './core';
import type { StateToken, StateValues } from './state';

export const SIGNAL = Symbol.for('@trigger::signal');

export interface Signal<T> {
  [SIGNAL]: StateToken;
  poll(): PollStatus<T>;
}

export function isSignal<T>(value: Reactive<T>): value is Signal<T> {
  return value != null && typeof value === 'object' && SIGNAL in value;
}

export const enum PollStatusType {
  Pending = 'Pending',
  Ready = 'Ready',
}

export type PollStatus<T> = Enum<{
  [PollStatusType.Pending]: {
    waker: SignalSource<T> | null;
  };
  [PollStatusType.Ready]: {
    value: Reactive<T>;
    waker: SignalSource<T> | null;
  };
}>;

export interface SignalSource<T> {
  listen(subscriber: PollSubscriber<T>): SignalSubscription;
}

export interface PollSubscriber<T> {
  pre(value: Reactive<T>): void;
  post(): void;
}

export interface SignalSubscription {
  unsubscribe(): void;
}

export const PollStatus = (() => {
  return {
    [PollStatusType.Pending]: Object.assign(
      function Pending<T>(
        waker: SignalSource<T> | null,
      ): EnumVariant<PollStatus<T>, PollStatusType.Pending> {
        // FIXME: consider returning singleton instances for empty/never instances
        return instantiateEnum(PollStatusType.Pending, { waker });
      },
      {
        is: function is<T>(
          value: PollStatus<T>,
        ): value is EnumVariant<PollStatus<T>, PollStatusType.Pending> {
          return value[VARIANT] === PollStatusType.Pending;
        },
      },
    ),
    [PollStatusType.Ready]: Object.assign(
      function Ready<T>(
        value: T,
        waker?: SignalSource<T>,
      ): EnumVariant<PollStatus<T>, PollStatusType.Ready> {
        return instantiateEnum(PollStatusType.Ready, { value, waker: waker ?? null });
      },
      {
        is: function is<T>(
          value: PollStatus<T>,
        ): value is EnumVariant<PollStatus<T>, PollStatusType.Ready> {
          return value[VARIANT] === PollStatusType.Ready;
        },
      },
    ),
  };
})();
