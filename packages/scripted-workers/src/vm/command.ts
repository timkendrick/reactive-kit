import type {
  AwaitMessageActorVmCommand,
  CompleteActorVmCommand,
  DelayActorVmCommand,
  FailActorVmCommand,
  KillActorVmCommand,
  SendActorVmCommand,
  SpawnActorVmCommand,
} from './commands';

/**
 * A union of all possible command descriptors that the VM can yield to the external runner.
 * The runner processes these descriptors to interact with the actor system and manage asynchronous operations.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type ActorVmCommand =
  | AwaitMessageActorVmCommand
  | CompleteActorVmCommand
  | DelayActorVmCommand
  | FailActorVmCommand
  | KillActorVmCommand
  | SpawnActorVmCommand<any, any, any>
  | SendActorVmCommand<any>;
/* eslint-enable @typescript-eslint/no-explicit-any */
