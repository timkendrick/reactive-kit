import { Message } from '@reactive-kit/runtime-messages';
import { SendHandlerAction } from '@reactive-kit/actor';
import { Predicate } from '../../types';
import { TestAction } from './types';

export function hasMessagePayload<T>(
  predicate: Predicate<T>,
): Predicate<TestAction<SendHandlerAction<Message<unknown, T>>>> {
  return (value) => predicate(value.action.message.payload);
}
