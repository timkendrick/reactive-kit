export const VM_COMMAND_AWAIT_MESSAGE = Symbol.for(
  '@reactive-kit/declarative-actors/vm/commands/await-message',
);

/** Describes a request to pause execution and await an incoming message. */
export interface AwaitMessageActorVmCommand {
  type: typeof VM_COMMAND_AWAIT_MESSAGE;
}

export function awaitMessageVmCommand(): AwaitMessageActorVmCommand {
  return { type: VM_COMMAND_AWAIT_MESSAGE };
}
