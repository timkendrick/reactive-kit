import type { ActorCreator } from '@reactive-kit/actor';

export const VM_COMMAND_SPAWN = Symbol.for('@reactive-kit/scripted-workers/vm/commands/spawn');

/** Describes a request to spawn a new actor. */
export interface SpawnActorVmCommand<C, I, O> {
  type: typeof VM_COMMAND_SPAWN;
  actor: ActorCreator<C, I, O>;
}

export function spawnVmCommand<C, I, O>(
  actor: ActorCreator<C, I, O>,
): SpawnActorVmCommand<C, I, O> {
  return { type: VM_COMMAND_SPAWN, actor };
}
