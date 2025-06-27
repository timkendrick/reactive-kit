export const OP_TYPE_LOOP_EXIT = Symbol.for(
  '@reactive-kit/scripted-workers/vm/operations/loop-exit',
);

/**
 * VM operation: LOOP_EXIT
 * Unconditionally exit the specified loop.
 */
export interface LoopExitOp {
  type: typeof OP_TYPE_LOOP_EXIT;
  /** Index of the loop on the VM stack, where 0 is the innermost loop (this allows exiting nested loops). */
  loopIndex: number;
}
