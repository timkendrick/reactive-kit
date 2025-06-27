import type { ActorHandle } from '@reactive-kit/actor';

export const VM_COMMAND_SEND = Symbol.for('@reactive-kit/scripted-workers/vm/commands/send');

/** Describes a request to send a message to another actor. */
export interface SendActorVmCommand<T> {
  type: typeof VM_COMMAND_SEND;
  target: ActorHandle<T>;
  message: T;
}

export function sendVmCommand<T>(target: ActorHandle<T>, message: T): SendActorVmCommand<T> {
  return { type: VM_COMMAND_SEND, target, message };
}
