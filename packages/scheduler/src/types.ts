import type { Actor, ActorFactory, ActorHandle } from '@reactive-kit/actor';
import { Enum, type GenericEnum } from '@reactive-kit/utils';

import type { SchedulerCommandMessage } from './messages';

export type SchedulerCommand<T> = Enum<{
  [SchedulerCommandType.Send]: {
    source: ActorHandle<T> | null;
    target: ActorHandle<T>;
    message: T;
  };
  [SchedulerCommandType.Spawn]: {
    source: ActorHandle<T> | null;
    target: ActorHandle<T>;
    // We're assuming here that the actor will be spawned with the correct config type.
    // This is not a sound assumption, but we would otherwise have to specify the config type as a
    // generic parameter for all command types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actor: ActorFactory<any, T, T>;
    config: unknown;
  };
  [SchedulerCommandType.Kill]: {
    source: ActorHandle<T> | null;
    target: ActorHandle<T>;
  };
  [SchedulerCommandType.Fail]: {
    source: ActorHandle<T> | null;
    target: ActorHandle<T>;
    error: unknown;
  };
  [SchedulerCommandType.Terminate]: void;
}>;
export enum SchedulerCommandType {
  Send = 'Send',
  Spawn = 'Spawn',
  Kill = 'Kill',
  Fail = 'Fail',
  Terminate = 'Terminate',
}
export interface GenericSchedulerCommand extends GenericEnum<1> {
  instance: SchedulerCommand<this['T1']>;
}
export const SchedulerCommand = Enum.create<GenericSchedulerCommand>({
  [SchedulerCommandType.Send]: true,
  [SchedulerCommandType.Spawn]: true,
  [SchedulerCommandType.Kill]: true,
  [SchedulerCommandType.Fail]: true,
  [SchedulerCommandType.Terminate]: true,
});

export interface SchedulerMiddlewareActor<T>
  extends Actor<SchedulerCommandMessage<T>, SchedulerCommandMessage<T>> {}

export type SchedulerMiddlewareFactory<T> = ActorFactory<
  ActorHandle<SchedulerCommandMessage<T>>,
  SchedulerCommandMessage<T>,
  SchedulerCommandMessage<T>
>;
