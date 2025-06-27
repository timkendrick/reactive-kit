import type { StateRef, ValueRef } from '../../types';

export const OP_TYPE_STATE_UPDATE = Symbol.for(
  '@reactive-kit/scripted-workers/vm/operations/state-update',
);

/**
 * VM operation: STATE_UPDATE
 * Modifies the value of a state on the VM stack.
 * @template S The type of the state being modified.
 */
export interface StateUpdateOp<S> {
  type: typeof OP_TYPE_STATE_UPDATE;
  stateHandle: StateRef<S>;
  updater: ValueRef<(currentState: S) => S>;
}
