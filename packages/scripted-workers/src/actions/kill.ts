import type { ActorHandle } from '@reactive-kit/actor';

import { createAction, type ActionBase, type SpawnedActorResolver } from '../types';

export const ACTION_TYPE_KILL = '@reactive-kit/scripted-workers/action/kill';

/**
 * Properties for the KillAction.
 */
export interface KillActionProps {
  /** The handle of the actor to kill. */
  target: ActorHandle<unknown> | SpawnedActorResolver<unknown>;
}

/**
 * Represents a declarative command to kill an actor.
 * @template T The message type of the actor definition.
 */
export type KillAction<T> = ActionBase<T, typeof ACTION_TYPE_KILL, KillActionProps>;

/**
 * Factory function to create a KillAction.
 * @param target - The handle of the actor to kill.
 */
export function kill<T>(
  target: ActorHandle<unknown> | SpawnedActorResolver<unknown>,
): KillAction<T> {
  const props: KillActionProps = { target };
  return createAction<KillAction<T>, T, typeof ACTION_TYPE_KILL, KillActionProps>(
    ACTION_TYPE_KILL,
    props,
  );
}
