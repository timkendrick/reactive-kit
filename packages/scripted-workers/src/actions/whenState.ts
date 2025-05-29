import { createAction, type ActionBase, type ActorCommand, type ValueRef } from '../types';

export const ACTION_TYPE_WHEN_STATE = '@reactive-kit/scripted-workers/action/when-state';

/**
 * Properties for the WhenStateAction.
 * @template T The message type of the actor definition.
 */
export interface WhenStateActionProps<T> {
  /** Predicate that determines whether the state matches the condition. */
  predicate: ValueRef<boolean>;
  /** Command to execute if the predicate is true. */
  commandIfTrue: ActorCommand<T>;
  /** Optional command to execute if the predicate is false. */
  commandIfFalse?: ActorCommand<T>;
}

/**
 * Represents a declarative command for conditional execution based on state.
 * @template T The message type of the actor definition.
 */
export type WhenStateAction<T> = ActionBase<
  T,
  typeof ACTION_TYPE_WHEN_STATE,
  WhenStateActionProps<T>
>;

/**
 * Factory function to create a WhenStateAction.
 * @param predicateResolver - A ValueRef that resolves to a boolean.
 * @param commandIfTrue - Command to execute if the predicate is true.
 * @param commandIfFalse - Optional command to execute if the predicate is false.
 */
export function whenState<T>(
  predicateResolver: ValueRef<boolean>,
  commandIfTrue: ActorCommand<T>,
  commandIfFalse?: ActorCommand<T>,
): WhenStateAction<T> {
  const props: WhenStateActionProps<T> = {
    predicate: predicateResolver,
    commandIfTrue,
    commandIfFalse,
  };
  return createAction<
    WhenStateAction<T>,
    T,
    typeof ACTION_TYPE_WHEN_STATE,
    WhenStateActionProps<T>
  >(ACTION_TYPE_WHEN_STATE, props);
}
