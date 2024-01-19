import { type Message, type Reactive } from '@trigger/types';

export const MESSAGE_UNSUBSCRIBE = 'core::subscribe';

export interface UnsubscribeMessage<T> extends Message<typeof MESSAGE_UNSUBSCRIBE> {
  expression: Reactive<T>;
}

export function createUnsubscribeMessage<T>(expression: Reactive<T>): UnsubscribeMessage<T> {
  return {
    type: MESSAGE_UNSUBSCRIBE,
    expression,
  };
}
