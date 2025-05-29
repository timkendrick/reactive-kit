import type { ActorHandle } from '@reactive-kit/actor';

import { createAction, type ActionBase } from '../../types';

export const ACTION_TYPE_COMPLETE = '@reactive-kit/scripted-workers/action/internal/complete';

/**
 * Properties for the CompleteAction.
 */
export interface CompleteActionProps<T> {
  /** The task to complete. */
  task: ActorHandle<T>;
}

/**
 * Represents a declarative command to terminate the actor normally.
 * @template T The message type of the actor definition.
 */
export type CompleteAction<T> = ActionBase<T, typeof ACTION_TYPE_COMPLETE, CompleteActionProps<T>>;

/**
 * Factory function to create a CompleteAction.
 */
export function complete<T>(task: ActorHandle<T>): CompleteAction<T> {
  const props: CompleteActionProps<T> = { task };
  return createAction<CompleteAction<T>, T, typeof ACTION_TYPE_COMPLETE, CompleteActionProps<T>>(
    ACTION_TYPE_COMPLETE,
    props,
  );
}
