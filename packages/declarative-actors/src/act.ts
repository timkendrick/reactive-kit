import {
  HandlerAction,
  type ActorHandle,
  type AsyncTaskFactory,
  type AsyncTaskInbox,
  type AsyncTaskOutbox,
} from '@reactive-kit/actor';

import type { AsyncCommandFactory } from './types';

export const TASK_TYPE_ACT = '@reactive-kit/task/act';

export function act<T>(
  factory: (
    self: ActorHandle<T>,
    helpers: { outbox: ActorHandle<T> },
  ) => // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AsyncCommandFactory<any, T>,
): AsyncTaskFactory<ActorHandle<T>, T, T> {
  return {
    type: TASK_TYPE_ACT,
    async: true,
    factory: (next, self) => {
      const command = factory(self, { outbox: next });
      return async function (inbox: AsyncTaskInbox<T>, outbox: AsyncTaskOutbox<T>): Promise<void> {
        // Run the command until completion, exposing the actor's inbox and outbox
        await command.task(command.config, inbox, outbox, done);
        // Terminate the actor
        outbox([HandlerAction.Kill(self)]);
      };
    },
  };
}

async function done(): Promise<void> {}
