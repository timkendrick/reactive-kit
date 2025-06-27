import { createAction, type ActionBase } from '../../types';

export const ACTION_TYPE_LOOP_CONTINUE =
  '@reactive-kit/scripted-workers/action/internal/loop-continue';

/**
 * Properties for the LoopContinueAction.
 */
export interface LoopContinueActionProps {
  /** Index of the loop on the VM stack, where 0 is the innermost loop (this allows continuing from within nested loops). */
  loopIndex: number;
}

/**
 * Internal action to continue a whileLoop from the beginning of its body.
 * @template T The message type for consistency.
 */
export type LoopContinueAction<T> = ActionBase<
  T,
  typeof ACTION_TYPE_LOOP_CONTINUE,
  LoopContinueActionProps
>;

/**
 * Factory to create a LoopContinueAction.
 * @param loopIndex - The 0-indexed depth of the loop to continue.
 */
export function loopContinue<T>(loopIndex: number): LoopContinueAction<T> {
  const props: LoopContinueActionProps = { loopIndex };
  return createAction<
    LoopContinueAction<T>,
    T,
    typeof ACTION_TYPE_LOOP_CONTINUE,
    LoopContinueActionProps
  >(ACTION_TYPE_LOOP_CONTINUE, props);
}
