import type { ValueRef } from '../../types';

export const OP_TYPE_DELAY = Symbol.for('@reactive-kit/scripted-workers/vm/operations/delay');

/**
 * VM operation: DELAY
 * Pauses execution for a specified duration.
 */
export interface DelayOp {
  type: typeof OP_TYPE_DELAY;
  durationMs: ValueRef<number>;
}
