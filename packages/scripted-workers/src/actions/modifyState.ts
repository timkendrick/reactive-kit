import { createAction, type ActionBase, type StateRef, type ValueRef } from '../types';

export const ACTION_TYPE_MODIFY_STATE = '@reactive-kit/scripted-workers/action/modify-state';

/**
 * Properties for the ModifyStateAction.
 * @template S The type of the state being modified.
 */
export interface ModifyStateActionProps<S> {
  /** The handle to the state to be updated. */
  stateHandle: StateRef<S>;
  /** A function that takes the current state and returns the new state. */
  updater: ValueRef<(currentState: S) => S>;
}

/**
 * Represents a declarative command to synchronously update state.
 * @template T The message type of the actor definition.
 * @template S The type of the state being modified.
 */
export type ModifyStateAction<T, S> = ActionBase<
  T,
  typeof ACTION_TYPE_MODIFY_STATE,
  ModifyStateActionProps<S>
>;

/**
 * Factory function to create a ModifyStateAction.
 * @param stateHandle - The handle to the state to be updated.
 * @param updater - A function that takes the current state and returns the new state.
 */
export function modifyState<T, S>(
  stateHandle: StateRef<S>,
  updater: ValueRef<(currentState: S) => S>,
): ModifyStateAction<T, S> {
  const props: ModifyStateActionProps<S> = { stateHandle, updater };
  return createAction<
    ModifyStateAction<T, S>,
    T,
    typeof ACTION_TYPE_MODIFY_STATE,
    ModifyStateActionProps<S>
  >(ACTION_TYPE_MODIFY_STATE, props);
}
