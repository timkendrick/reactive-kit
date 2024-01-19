import { type Message, type Reactive } from '@trigger/types';

export const MESSAGE_SUBSCRIBE = 'core::subscribe';

export interface SubscribeMessage<T> extends Message<typeof MESSAGE_SUBSCRIBE> {
  expression: Reactive<T>;
}

export function createSubscribeMessage<T>(expression: Reactive<T>): SubscribeMessage<T> {
  return {
    type: MESSAGE_SUBSCRIBE,
    expression,
  };
}
