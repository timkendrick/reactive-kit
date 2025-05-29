import type { ActorHandle } from '@reactive-kit/actor';

import type { SpawnedActorResolver } from '../../types';

export const OP_TYPE_ACTOR_KILL = Symbol.for(
  '@reactive-kit/scripted-workers/vm/operations/actor-kill',
);

/**
 * VM operation: ACTOR_KILL
 * Kills the specified actor.
 */
export interface ActorKillOp {
  type: typeof OP_TYPE_ACTOR_KILL;
  target: ActorHandle<unknown> | SpawnedActorResolver<unknown>;
}
