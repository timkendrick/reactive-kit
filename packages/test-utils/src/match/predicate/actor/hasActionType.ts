import {
  HandlerAction,
  HandlerActionType,
  KillHandlerAction,
  SendHandlerAction,
  SpawnHandlerAction,
} from '@reactive-kit/actor';
import { VARIANT } from '@reactive-kit/utils';
import { Predicate } from '../../types';
import { TestAction } from './types';

export function hasActionType(
  type: HandlerActionType.Send,
): <T>(value: TestAction<HandlerAction<T>>) => value is TestAction<SendHandlerAction<T>>;
export function hasActionType(
  type: HandlerActionType.Spawn,
): <T>(value: TestAction<HandlerAction<T>>) => value is TestAction<SpawnHandlerAction<T>>;
export function hasActionType(
  type: HandlerActionType.Kill,
): <T>(value: TestAction<HandlerAction<T>>) => value is TestAction<KillHandlerAction<T>>;
export function hasActionType(
  type: HandlerActionType,
): <T>(value: TestAction<HandlerAction<T>>) => boolean;
export function hasActionType(
  type: HandlerActionType,
): Predicate<TestAction<HandlerAction<unknown>>> {
  return (value) => value.action[VARIANT] === type;
}
