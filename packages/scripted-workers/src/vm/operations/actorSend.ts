import type { ActorHandle } from '@reactive-kit/actor';

import type { SpawnedActorResolver, ValueRef } from '../../types';

export const OP_TYPE_ACTOR_SEND = Symbol.for(
  '@reactive-kit/scripted-workers/vm/operations/actor-send',
);

/**
 * VM operation: ACTOR_SEND
 * Sends a message to a target actor.
 * @template T The message type for the target actor.
 */
export interface ActorSendOp<T> {
  type: typeof OP_TYPE_ACTOR_SEND;
  target: ActorHandle<T> | SpawnedActorResolver<T>;
  message: ValueRef<T>;
}
