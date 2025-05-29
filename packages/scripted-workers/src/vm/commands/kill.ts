import type { ActorHandle } from '@reactive-kit/actor';

export const VM_COMMAND_KILL = Symbol.for('@reactive-kit/scripted-workers/vm/commands/kill');

/** Describes a request to kill another actor. */
export interface KillActorVmCommand {
  type: typeof VM_COMMAND_KILL;
  target: ActorHandle<unknown>;
}

export function killVmCommand(target: ActorHandle<unknown>): KillActorVmCommand {
  return { type: VM_COMMAND_KILL, target };
}
