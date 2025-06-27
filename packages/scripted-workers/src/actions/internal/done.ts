import { createAction, type ActionBase } from '../../types';

export const ACTION_TYPE_DONE = '@reactive-kit/scripted-workers/action/internal/done';

/**
 * Properties for the DoneAction.
 */
export interface DoneActionProps {
  /** Absolute index of the block to break out of, with 0 being the *outermost* block. */
  blockIndex: number;
}

/**
 * Represents a declarative command to terminate the actor with an error.
 */
export type DoneAction = ActionBase<void, typeof ACTION_TYPE_DONE, DoneActionProps>;

/**
 * Factory function to create a DoneAction.
 * @param blockIndex - Absolute index of the block to break out of, with 0 being the *outermost* block.
 */
export function done(blockIndex: number): DoneAction {
  const props: DoneActionProps = { blockIndex };
  return createAction<DoneAction, void, typeof ACTION_TYPE_DONE, DoneActionProps>(
    ACTION_TYPE_DONE,
    props,
  );
}
