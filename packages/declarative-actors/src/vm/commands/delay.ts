export const VM_COMMAND_DELAY = Symbol.for('@reactive-kit/declarative-actors/vm/commands/delay');

/** Describes a request to pause execution for a specific duration. */
export interface DelayActorVmCommand {
  type: typeof VM_COMMAND_DELAY;
  durationMs: number;
}

export function delayVmCommand(durationMs: number): DelayActorVmCommand {
  return { type: VM_COMMAND_DELAY, durationMs };
}
