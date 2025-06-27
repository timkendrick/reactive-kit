import { createAction, type ActionBase } from '../types';

export const ACTION_TYPE_NOOP = '@reactive-kit/scripted-workers/action/noop';

/**
 * Properties for the NoopAction.
 */
export interface NoopActionProps {}

/**
 * Represents a declarative command that performs no operation.
 * @template T The message type of the actor definition.
 */
export type NoopAction<T> = ActionBase<T, typeof ACTION_TYPE_NOOP, NoopActionProps>;

/**
 * Factory function to create a NoopAction.
 */
export function noop<T>(): NoopAction<T> {
  const props: NoopActionProps = {};
  return createAction<NoopAction<T>, T, typeof ACTION_TYPE_NOOP, NoopActionProps>(
    ACTION_TYPE_NOOP,
    props,
  );
}
