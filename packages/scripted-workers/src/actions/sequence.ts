import { createAction, type ActionBase, type ActorCommand } from '../types';

export const ACTION_TYPE_SEQUENCE = '@reactive-kit/scripted-workers/action/sequence';

/**
 * Properties for the SequenceAction.
 * @template T The message type of the actor definition.
 */
export interface SequenceControls<T> {
  /** Factory that creates a command that terminates the sequence. */
  done: () => ActorCommand<T>;
}

/**
 * Properties for the SequenceAction.
 * @template T The message type of the actor definition.
 */
export interface SequenceActionProps<T> {
  actions: (controls: SequenceControls<T>) => Array<ActorCommand<T>>;
}

/**
 * Represents a declarative command to execute a sequence of other commands.
 * @template T The message type of the actor definition.
 */
export type SequenceAction<T> = ActionBase<T, typeof ACTION_TYPE_SEQUENCE, SequenceActionProps<T>>;

/**
 * Factory function to create a SequenceAction.
 * @param commandsFactory - A function that returns an array of ActorCommands.
 */
export function sequence<T>(
  commandsFactory: (controls: SequenceControls<T>) => Array<ActorCommand<T>>,
): SequenceAction<T> {
  const props: SequenceActionProps<T> = { actions: commandsFactory };
  return createAction<SequenceAction<T>, T, typeof ACTION_TYPE_SEQUENCE, SequenceActionProps<T>>(
    ACTION_TYPE_SEQUENCE,
    props,
  );
}
