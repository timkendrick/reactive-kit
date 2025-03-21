import { ActorHandle, HandlerAction } from '@reactive-kit/actor';
import { Predicate } from '../../types';
import { TestAction } from './types';

export function sentTo(
  target: ActorHandle<unknown>,
): Predicate<TestAction<HandlerAction<unknown>>> {
  return (value) => value.action.target === target;
}
