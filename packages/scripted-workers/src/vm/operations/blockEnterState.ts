import type { ValueRef } from '../../types';

export const OP_TYPE_BLOCK_ENTER_STATE = Symbol.for(
  '@reactive-kit/scripted-workers/vm/operations/block-enter-state',
);

/**
 * VM operation: BLOCK_ENTER_STATE
 * Marks the beginning of a block that declares a local state value.
 * Pushes a new block context onto the VM stack.
 */
export interface BlockEnterStateOp<S> {
  type: typeof OP_TYPE_BLOCK_ENTER_STATE;
  /** The initial state value for the block. */
  initialState: ValueRef<() => S>;
  /** Length of the block in instructions, excluding the `BLOCK_ENTER_STATE` instruction itself but including any terminating BLOCK_BREAK instruction. */
  length: number;
}
