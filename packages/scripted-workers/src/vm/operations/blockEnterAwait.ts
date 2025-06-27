export const OP_TYPE_BLOCK_ENTER_AWAIT = Symbol.for(
  '@reactive-kit/scripted-workers/vm/operations/block-enter-await',
);

/**
 * VM operation: BLOCK_ENTER_AWAIT
 * Pauses execution until a message is received.
 * Marks the beginning of a new block that declares a local state value to hold the received message.
 * Pushes a new block context onto the VM stack.
 */
export interface BlockEnterAwaitOp {
  type: typeof OP_TYPE_BLOCK_ENTER_AWAIT;
  /** Length of the block in instructions, excluding the `BLOCK_ENTER_AWAIT` instruction itself but including any terminating BLOCK_BREAK instruction. */
  length: number;
}
