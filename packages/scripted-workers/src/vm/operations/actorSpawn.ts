import type { ActorCreator } from '@reactive-kit/actor';

// Define the unique symbol for the actor spawn VM operation type
export const OP_TYPE_ACTOR_SPAWN = Symbol.for(
  '@reactive-kit/scripted-workers/vm/operations/actor-spawn',
);

/**
 * VM operation: ACTOR_SPAWN
 * Spawns a new actor using the provided factory.
 *
 * @template C The configuration type of the actor being spawned.
 * @template I The input message type of the actor being spawned.
 * @template O The output message type of the actor being spawned.
 */
export interface ActorSpawnOp<C, I, O> {
  type: typeof OP_TYPE_ACTOR_SPAWN;
  /**
   * The configured factory for the actor to be spawned.
   */
  factory: ActorCreator<C, I, O>;
}
