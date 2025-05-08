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

export const ASYNC_TASK_COMMAND_TYPE_KILL = '@reactive-kit/test-utils/task/command/kill';

export interface CompleteCommandConfig<T> {
  target: ActorHandle<T>;
}

export function kill<T>(target: ActorHandle<T>): AsyncCommandFactory<CompleteCommandConfig<T>, T> {
  return {
    type: ASYNC_TASK_COMMAND_TYPE_KILL,
    task: killTask,
    config: {
      target,
    },
  };
}

async function killTask<T>(
  config: CompleteCommandConfig<T>,
  _inbox: AsyncTaskInbox<T>,
  outbox: AsyncTaskOutbox<T>,
  next: AsyncCommandContinuation,
): AsyncCommandResult {
  const { target } = config;
  // Terminate the target actor
  outbox([HandlerAction.Kill(target)]);
  // Process any remaining commands (these will be dropped by the scheduler if the target is the mock task itself)
  return next();
}
