import {
  createAction,
  type ActionBase,
  type ActorCommand,
  type StateRef,
  type ValueRef,
} from '../types';

export const ACTION_TYPE_WITH_STATE = '@reactive-kit/scripted-workers/action/with-state';

/**
 * Properties for the WithStateAction.
 * @template S The type of the state being managed.
 * @template T The message type of the actor definition.
 */
export interface WithStateActionProps<S, T> {
  /** Initial state definition. */
  initialState: ValueRef<() => S>;
  /** Scoped block definition. */
  factory: (stateHandle: StateRef<S>) => ActorCommand<T>;
}

/**
 * Represents a declarative command to define a stateful scope.
 * @template T The message type of the actor definition.
 * @template S The type of the state being managed.
 */
export type WithStateAction<T, S> = ActionBase<
  T,
  typeof ACTION_TYPE_WITH_STATE,
  WithStateActionProps<S, T>
>;

/**
 * Factory function to create a WithStateAction.
 * @param initialState - A factory function that returns the initial state.
 * @param factory - A factory function that receives a StateHandle and returns an ActorCommand.
 */
export function withState<T, S>(
  initialState: ValueRef<() => S>,
  factory: (stateHandle: StateRef<S>) => ActorCommand<T>,
): WithStateAction<T, S> {
  const props: WithStateActionProps<S, T> = { initialState, factory };
  return createAction<
    WithStateAction<T, S>,
    T,
    typeof ACTION_TYPE_WITH_STATE,
    WithStateActionProps<S, T>
  >(ACTION_TYPE_WITH_STATE, props);
}
