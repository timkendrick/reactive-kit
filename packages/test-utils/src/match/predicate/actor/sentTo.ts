import type { ActorHandle, HandlerAction } from '@reactive-kit/actor';

import type { Predicate } from '../../types';

import type { TestAction } from './types';

export function sentTo(
  target: Predicate<ActorHandle<unknown>>,
): Predicate<TestAction<HandlerAction<unknown>>> {
  return (value) => target(value.action.target);
}
