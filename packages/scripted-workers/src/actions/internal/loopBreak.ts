import { createAction, type ActionBase } from '../../types';

export const ACTION_TYPE_LOOP_BREAK = '@reactive-kit/scripted-workers/action/internal/loop-break';

/**
 * Properties for the LoopBreakAction.
 */
export interface LoopBreakActionProps {
  /** Index of the loop on the VM stack, where 0 is the innermost loop (this allows breaking out of nested loops). */
  loopIndex: number;
}

/**
 * Internal action to break out of a whileLoop.
 * @template T The message type for consistency, though this action is terminal for the loop.
 */
export type LoopBreakAction<T> = ActionBase<T, typeof ACTION_TYPE_LOOP_BREAK, LoopBreakActionProps>;

/**
 * Factory to create a LoopBreakAction.
 * @param loopIndex - The 0-indexed depth of the loop to break.
 */
export function loopBreak<T>(loopIndex: number): LoopBreakAction<T> {
  const props: LoopBreakActionProps = { loopIndex };
  return createAction<LoopBreakAction<T>, T, typeof ACTION_TYPE_LOOP_BREAK, LoopBreakActionProps>(
    ACTION_TYPE_LOOP_BREAK,
    props,
  );
}
