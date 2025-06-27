export const OP_TYPE_LOOP_CONTINUE = Symbol.for(
  '@reactive-kit/scripted-workers/vm/operations/loop-continue',
);

/**
 * VM operation: LOOP_CONTINUE
 * Continues to the next iteration of the specified loop.
 */
export interface LoopContinueOp {
  type: typeof OP_TYPE_LOOP_CONTINUE;
  /** Index of the loop on the VM stack, where 0 is the innermost loop (this allows continuing nested loops). */
  loopIndex: number;
}
