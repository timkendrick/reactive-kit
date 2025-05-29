export const OP_TYPE_NOOP = Symbol.for('@reactive-kit/declarative-actors/vm/operations/noop');

/**
 * VM operation: NOOP
 * No operation; does nothing.
 */
export interface NoopOp {
  type: typeof OP_TYPE_NOOP;
}
