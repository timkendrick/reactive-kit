import type { ActorHandle, HandlerAction } from '@reactive-kit/actor';

import type { Predicate } from '../../types';

import type { TestAction } from './types';

export function sentFrom(
  source: ActorHandle<unknown>,
): Predicate<TestAction<HandlerAction<unknown>>> {
  return (value) => value.from === source;
}
