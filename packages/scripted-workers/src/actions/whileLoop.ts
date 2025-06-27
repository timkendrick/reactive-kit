import { createAction, type ActionBase, type ActorCommand } from '../types';

export const ACTION_TYPE_WHILE_LOOP = '@reactive-kit/scripted-workers/action/while-loop';

/**
 * Loop control commands for a whileLoop.
 * @template T The message type of the actor definition.
 */
export interface WhileLoopControls<T> {
  /** Command to break out of the loop prematurely. */
  break: () => ActorCommand<T>;
  /** Command to continue the loop prematurely. */
  continue: () => ActorCommand<T>;
}

/**
 * Properties for the WhileLoopAction.
 * @template T The message type of the actor definition.
 */
export interface WhileLoopActionProps<T> {
  /** Loop body definition. */
  factory: (controls: WhileLoopControls<T>) => ActorCommand<T>;
}

/**
 * Represents a declarative command for repeated execution of a command sequence.
 * @template T The message type of the actor definition.
 */
export type WhileLoopAction<T> = ActionBase<
  T,
  typeof ACTION_TYPE_WHILE_LOOP,
  WhileLoopActionProps<T>
>;

/**
 * Factory function to create a WhileLoopAction.
 * @param factory - A function that returns an ActorCommand representing the loop body.
 */
export function whileLoop<T>(
  factory: (controls: WhileLoopControls<T>) => ActorCommand<T>,
): WhileLoopAction<T> {
  const props: WhileLoopActionProps<T> = { factory };
  return createAction<
    WhileLoopAction<T>,
    T,
    typeof ACTION_TYPE_WHILE_LOOP,
    WhileLoopActionProps<T>
  >(ACTION_TYPE_WHILE_LOOP, props);
}
