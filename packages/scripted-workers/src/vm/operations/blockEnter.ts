export const OP_TYPE_BLOCK_ENTER = Symbol.for(
  '@reactive-kit/scripted-workers/vm/operations/block-enter',
);

/**
 * VM operation: BLOCK_ENTER
 * Marks the beginning of a new block on the VM stack.
 */
export interface BlockEnterOp {
  type: typeof OP_TYPE_BLOCK_ENTER;
  /** Length of the block in instructions, excluding the `BLOCK_ENTER` instruction itself but including any terminating BLOCK_BREAK instruction. */
  length: number;
}
