import type { ActorHandle } from '@reactive-kit/actor';

import { createAction, type ActionBase, type SpawnedActorResolver, type ValueRef } from '../types';

export const ACTION_TYPE_SEND = '@reactive-kit/scripted-workers/action/send';

/**
 * Properties for the SendAction.
 * @template TTarget The type of message to be sent.
 */
export interface SendActionProps<TTarget> {
  /** The handle of the actor to send the message to. */
  target: ActorHandle<TTarget> | SpawnedActorResolver<TTarget>;
  /** The message to send */
  message: ValueRef<TTarget>;
}

/**
 * Represents a declarative command to send a message.
 * @template T The message type of the actor definition.
 * @template TTarget The type of message to be sent.
 */
export type SendAction<T, TTarget> = ActionBase<
  T,
  typeof ACTION_TYPE_SEND,
  SendActionProps<TTarget>
>;

/**
 * Factory function to create a SendAction.
 * @param target - The handle of the actor to send the message to.
 * @param message - The message to send
 */
export function send<T, TTarget>(
  target: ActorHandle<TTarget> | SpawnedActorResolver<TTarget>,
  message: ValueRef<TTarget>,
): SendAction<T, TTarget> {
  const props: SendActionProps<TTarget> = { target, message };
  return createAction<SendAction<T, TTarget>, T, typeof ACTION_TYPE_SEND, SendActionProps<TTarget>>(
    ACTION_TYPE_SEND,
    props,
  );
}
