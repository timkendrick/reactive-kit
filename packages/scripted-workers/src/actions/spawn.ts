import type { ActorCreator, ActorFactory } from '@reactive-kit/actor';

import {
  createAction,
  type ActionBase,
  type ActorCommand,
  type SpawnedActorResolver,
} from '../types';

export const ACTION_TYPE_SPAWN = '@reactive-kit/scripted-workers/action/spawn';

/**
 * Represents the options for a SpawnAction.
 * @template T The message type of the actor definition.
 * @template C The configuration type of the actor being spawned.
 * @template I The input message type of the actor being spawned.
 * @template O The output message type of the actor being spawned.
 */
export interface SpawnActionOptions<T, C, I, O> {
  /**
   * The actor creator for the actor to be spawned.
   */
  actor: ActorCreator<C, I, O>;
  /**
   * A function that returns a command to be executed after the actor is spawned. The function will be called with the handle of the newly spawned actor.
   */
  next: (handle: SpawnedActorResolver<I>) => ActorCommand<T>;
}

/**
 * Represents a declarative action to spawn a new actor.
 * @template T The message type of the actor definition.
 * @template C The configuration type of the actor being spawned.
 * @template I The input message type of the actor being spawned.
 * @template O The output message type of the actor being spawned.
 */
export type SpawnAction<T, C, I, O> = ActionBase<
  T,
  typeof ACTION_TYPE_SPAWN,
  SpawnActionOptions<T, C, I, O>
>;

/**
 * Creates a declarative action command to spawn a new actor.
 *
 * @template T The message type of the actor definition.
 * @template C The configuration type of the actor being spawned.
 * @template I The input message type of the actor to be spawned.
 * @template O The output message type of the actor to be spawned.
 *
 * @param factory - The factory used to create the new actor. The factory will be called with the output handle of the newly spawned actor.
 * @param config - The configuration for the new actor.
 * @param next - A function that returns a command to be executed after the actor is spawned. The function will be called with the handle of the newly spawned actor.
 * @returns A SpawnAction command object.
 */
export function spawn<T, C, I, O>(
  factory: ActorFactory<C, I, O>,
  config: C,
  next: (handle: SpawnedActorResolver<I>) => ActorCommand<T>,
): SpawnAction<T, C, I, O> {
  const actor: ActorCreator<C, I, O> = factory.async
    ? { actor: factory, config }
    : { actor: factory, config };
  const props: SpawnActionOptions<T, C, I, O> = { actor, next };
  return createAction<
    SpawnAction<T, C, I, O>,
    T,
    typeof ACTION_TYPE_SPAWN,
    SpawnActionOptions<T, C, I, O>
  >(ACTION_TYPE_SPAWN, props);
}
