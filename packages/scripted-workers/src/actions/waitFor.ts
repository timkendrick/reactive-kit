import {
  createAction,
  type ActionBase,
  type ActorCommand,
  type StateRef,
  type ValueRef,
} from '../types';

export const ACTION_TYPE_WAIT_FOR = '@reactive-kit/scripted-workers/action/wait-for';

/**
 * Properties for the WaitForAction.
 * @template T The message type of the actor definition.
 * @template TNarrowed The narrowed message type if the predicate is a type guard.
 */
export interface WaitForActionProps<T, TNarrowed extends T> {
  /** A function that determines whether the incoming message matches the condition. */
  predicate: ValueRef<(message: T) => message is TNarrowed>;
  /** Optional factory for the command to execute if the predicate is true. */
  commandIfTrue?: (messageHandle: StateRef<TNarrowed>) => ActorCommand<T>;
}

/**
 * Represents a declarative command to pause execution until a specific message is received.
 * @template T The message type of the actor definition.
 * @template TNarrowed The narrowed message type if the predicate is a type guard.
 */
export type WaitForAction<T, TNarrowed extends T> = ActionBase<
  T,
  typeof ACTION_TYPE_WAIT_FOR,
  WaitForActionProps<T, TNarrowed>
>;

/**
 * Factory function to create a WaitForAction.
 * @param predicate - Predicate function that matches incoming messages.
 * @param commandIfTrue - Optional factory for a command to execute if the predicate is true.
 */
export function waitFor<T, TNarrowed extends T>(
  predicate: ValueRef<(message: T) => message is TNarrowed>,
  commandIfTrue?: (messageHandle: StateRef<TNarrowed>) => ActorCommand<T>,
): WaitForAction<T, TNarrowed> {
  const props: WaitForActionProps<T, TNarrowed> = { predicate, commandIfTrue };
  return createAction<
    WaitForAction<T, TNarrowed>,
    T,
    typeof ACTION_TYPE_WAIT_FOR,
    WaitForActionProps<T, TNarrowed>
  >(ACTION_TYPE_WAIT_FOR, props);
}
