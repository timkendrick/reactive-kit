export const VM_COMMAND_COMPLETE = Symbol.for(
  '@reactive-kit/scripted-workers/vm/commands/complete',
);

/** Describes that the actor's task should complete successfully. */
export interface CompleteActorVmCommand {
  type: typeof VM_COMMAND_COMPLETE;
}

export function completeVmCommand(): CompleteActorVmCommand {
  return { type: VM_COMMAND_COMPLETE };
}
