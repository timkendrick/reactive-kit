export const VM_COMMAND_FAIL = Symbol.for('@reactive-kit/scripted-workers/vm/commands/fail');

/** Describes that the actor's task should fail with an error. */
export interface FailActorVmCommand {
  type: typeof VM_COMMAND_FAIL;
  error: Error;
}

export function failVmCommand(error: Error): FailActorVmCommand {
  return { type: VM_COMMAND_FAIL, error };
}
