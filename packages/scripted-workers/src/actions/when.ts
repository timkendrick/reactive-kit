import {
  createAction,
  type ActionBase,
  type ActorCommand,
  type StateRef,
  type ValueRef,
} from '../types';

export const ACTION_TYPE_WHEN = '@reactive-kit/scripted-workers/action/when';

/**
 * Properties for the WhenAction.
 * @template T The message type of the actor definition.
 * @template TNarrowed The narrowed message type if the predicate is a type guard.
 */
export interface WhenActionProps<T, TNarrowed extends T> {
  /** A function that determines whether the incoming message matches the condition. */
  predicate: ValueRef<(message: T) => message is TNarrowed>;
  /** Command to execute if the predicate is true. */
  commandIfTrue: (messageHandle: StateRef<TNarrowed>) => ActorCommand<T>;
  /** Optional command to execute if the predicate is false. */
  commandIfFalse?: (messageHandle: StateRef<T>) => ActorCommand<T>;
}

/**
 * Represents a declarative command that consumes a message and conditionally executes further commands.
 * @template T The message type of the actor definition.
 * @template TNarrowed The narrowed message type if the predicate is a type guard.
 */
export type WhenAction<T, TNarrowed extends T> = ActionBase<
  T,
  typeof ACTION_TYPE_WHEN,
  WhenActionProps<T, TNarrowed>
>;

/**
 * Factory function to create a WhenAction.
 * @param predicate - Predicate function that matches incoming messages.
 * @param commandIfTrue - Factory for a command to execute if the predicate is true.
 * @param commandIfFalse - Optional factory for a command to execute if the predicate is false.
 */
export function when<T, TNarrowed extends T>(
  predicate: ValueRef<(message: T) => message is TNarrowed>,
  commandIfTrue: (messageHandle: StateRef<TNarrowed>) => ActorCommand<T>,
  commandIfFalse?: (messageHandle: StateRef<T>) => ActorCommand<T>,
): WhenAction<T, TNarrowed> {
  const props: WhenActionProps<T, TNarrowed> = { predicate, commandIfTrue, commandIfFalse };
  return createAction<
    WhenAction<T, TNarrowed>,
    T,
    typeof ACTION_TYPE_WHEN,
    WhenActionProps<T, TNarrowed>
  >(ACTION_TYPE_WHEN, props);
}
