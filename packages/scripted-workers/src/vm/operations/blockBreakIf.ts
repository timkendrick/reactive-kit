import type { ValueRef } from '../../types';

export const OP_TYPE_BLOCK_BREAK_IF = Symbol.for(
  '@reactive-kit/scripted-workers/vm/operations/block-break-if',
);

/**
 * VM operation: BLOCK_BREAK_IF
 * Conditionally exit the specified block according to whether the predicate is true.
 */
export interface BlockBreakIfOp {
  type: typeof OP_TYPE_BLOCK_BREAK_IF;
  predicate: ValueRef<boolean>;
  /** Index of the block on the VM stack, where 0 is the innermost block (this allows exiting nested blocks). */
  blockIndex: number;
}
