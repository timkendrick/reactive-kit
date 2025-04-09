import type { SendHandlerAction } from '@reactive-kit/actor';
import type { Message } from '@reactive-kit/plugin-evaluate';

import type { Predicate, TypeNarrowingPredicate } from '../../types';

import type { TestAction } from './types';

export function hasMessageType<T extends Message<unknown, unknown>>(
  type: T['type'],
): TypeNarrowingPredicate<
  TestAction<SendHandlerAction<Message<unknown, unknown>>>,
  TestAction<SendHandlerAction<T>>
>;
export function hasMessageType<T>(
  type: T,
): <V extends Message<unknown, unknown>>(
  value: TestAction<SendHandlerAction<V>>,
) => value is TestAction<SendHandlerAction<Extract<V, { type: T }>>>;
export function hasMessageType<T>(
  type: T,
): Predicate<TestAction<SendHandlerAction<Message<unknown, unknown>>>> {
  return (value) => value.action.message.type === type;
}
