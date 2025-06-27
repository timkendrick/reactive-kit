export const OP_TYPE_LOOP_ENTER = Symbol.for(
  '@reactive-kit/scripted-workers/vm/operations/loop-enter',
);

/**
 * VM operation: LOOP_ENTER
 * Marks the beginning of a loop context on the VM stack.
 */
export interface LoopEnterOp {
  type: typeof OP_TYPE_LOOP_ENTER;
  /** Length of the loop in instructions, excluding the `LOOP_ENTER` instruction itself but including any terminating LOOP_CONTINUE instruction. */
  length: number;
}
