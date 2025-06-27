import type { ActorHandle } from '@reactive-kit/actor';

import { createAction, type ActionBase } from '../../types';

export const ACTION_TYPE_FAIL = '@reactive-kit/scripted-workers/action/internal/fail';

/**
 * Properties for the FailAction.
 */
export interface FailActionProps<T> {
  /** The task to fail. */
  task: ActorHandle<T>;
  /** The error to fail the task with. */
  error: Error;
}

/**
 * Represents a declarative command to terminate the actor with an error.
 * @template T The message type of the actor definition.
 */
export type FailAction<T> = ActionBase<T, typeof ACTION_TYPE_FAIL, FailActionProps<T>>;

/**
 * Factory function to create a FailAction.
 * @param task - The task to fail.
 * @param error - The error to fail the task with.
 */
export function fail<T>(task: ActorHandle<T>, error: Error): FailAction<T> {
  const props: FailActionProps<T> = { task, error };
  return createAction<FailAction<T>, T, typeof ACTION_TYPE_FAIL, FailActionProps<T>>(
    ACTION_TYPE_FAIL,
    props,
  );
}
