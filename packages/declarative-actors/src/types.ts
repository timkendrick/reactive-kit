import type { AsyncTaskInbox, AsyncTaskOutbox } from '@reactive-kit/actor';

export interface AsyncCommandFactory<C, T> {
  type: string;
  task: AsyncCommandTask<C, T>;
  config: C;
}

export interface AsyncCommandTask<C, T> {
  (
    config: C,
    inbox: AsyncTaskInbox<T>,
    outbox: AsyncTaskOutbox<T>,
    next: AsyncCommandContinuation,
  ): AsyncCommandResult;
}

export type AsyncCommandContinuation = () => AsyncCommandResult;
export type AsyncCommandResult = Promise<void>;
