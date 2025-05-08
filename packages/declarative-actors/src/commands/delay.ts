import type { AsyncTaskInbox, AsyncTaskOutbox } from '@reactive-kit/actor';

import type { AsyncCommandContinuation, AsyncCommandFactory, AsyncCommandResult } from '../types';

export const ASYNC_TASK_COMMAND_TYPE_DELAY = '@reactive-kit/test-utils/task/command/delay';

interface DelayCommandConfig {
  durationMs: number;
}

/**
 * Creates a mock task command that pauses execution for a specified duration.
 * @param durationMs The duration to pause in milliseconds.
 */
export function delay<T>(durationMs: number): AsyncCommandFactory<DelayCommandConfig, T> {
  return {
    type: ASYNC_TASK_COMMAND_TYPE_DELAY,
    task: delayTask,
    config: {
      durationMs,
    },
  };
}

async function delayTask<T>(
  config: DelayCommandConfig,
  _inbox: AsyncTaskInbox<T>,
  _outbox: AsyncTaskOutbox<T>,
  next: AsyncCommandContinuation,
): AsyncCommandResult {
  const { durationMs } = config;
  // Pause execution for the specified duration
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  // Continue with the next task
  return next();
}
