import type { SendHandlerAction } from '@reactive-kit/actor';
import type { Message } from '@reactive-kit/plugin-evaluate';

import type { Predicate } from '../../types';

import type { TestAction } from './types';

export function hasMessagePayload<T>(
  predicate: Predicate<T>,
): Predicate<TestAction<SendHandlerAction<Message<unknown, T>>>> {
  return (value) => predicate(value.action.message.payload);
}
