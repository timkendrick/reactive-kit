import { ActorHandle, HandlerAction } from '@reactive-kit/actor';
import { Predicate } from '../../types';
import { TestAction } from './types';

export function sentFrom(
  source: ActorHandle<unknown>,
): Predicate<TestAction<HandlerAction<unknown>>> {
  return (value) => value.from === source;
}
