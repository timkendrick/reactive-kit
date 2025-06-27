export const OP_TYPE_BLOCK_BREAK = Symbol.for(
  '@reactive-kit/scripted-workers/vm/operations/block-break',
);

/**
 * VM operation: BLOCK_BREAK
 * Exit the specified block.
 */
export interface BlockBreakOp {
  type: typeof OP_TYPE_BLOCK_BREAK;
  /** Index of the block on the VM stack, where 0 is the innermost block (this allows breaking out of nested blocks). */
  blockIndex: number;
}
