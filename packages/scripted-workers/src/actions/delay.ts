import { createAction, type ActionBase, type ValueRef } from '../types';

export const ACTION_TYPE_DELAY = '@reactive-kit/scripted-workers/action/delay';

/**
 * Properties for the DelayAction.
 */
export interface DelayActionProps {
  /** The duration to wait in milliseconds */
  durationMs: ValueRef<number>;
}

/**
 * Represents a declarative command to pause execution for a specified duration.
 * @template T The message type of the actor definition.
 */
export type DelayAction<T> = ActionBase<T, typeof ACTION_TYPE_DELAY, DelayActionProps>;

/**
 * Factory function to create a DelayAction.
 * @param durationMs - The duration to wait in milliseconds
 */
export function delay<T>(durationMs: ValueRef<number>): DelayAction<T> {
  const props: DelayActionProps = { durationMs };
  return createAction<DelayAction<T>, T, typeof ACTION_TYPE_DELAY, DelayActionProps>(
    ACTION_TYPE_DELAY,
    props,
  );
}
