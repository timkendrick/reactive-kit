import {
  HandlerAction,
  type ActorHandle,
  type AsyncTaskInbox,
  type AsyncTaskOutbox,
} from '@reactive-kit/actor';

import type {
  AsyncCommandContinuation,
  AsyncCommandFactory,
  AsyncCommandResult,
} from '../../types';

export const ASYNC_TASK_COMMAND_TYPE_SEND = '@reactive-kit/test-utils/task/command/send';

interface SendCommandConfig<T> {
  target: ActorHandle<T>;
  message: T;
}

// eslint-disable-next-line require-yield
export function send<T>(
  target: ActorHandle<T>,
  message: T,
): AsyncCommandFactory<SendCommandConfig<T>, T> {
  return {
    type: ASYNC_TASK_COMMAND_TYPE_SEND,
    task: sendTask,
    config: {
      target,
      message,
    },
  };
}

async function sendTask<T>(
  config: SendCommandConfig<T>,
  _inbox: AsyncTaskInbox<T>,
  outbox: AsyncTaskOutbox<T>,
  next: AsyncCommandContinuation,
): AsyncCommandResult {
  const { target, message } = config;
  // Emit the message
  outbox([HandlerAction.Send(target, message)]);
  // Continue with the next task
  return next();
}
