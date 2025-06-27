import {
  HandlerAction,
  type ActorHandle,
  type AsyncActorCreator,
  type AsyncTaskFactory,
} from '@reactive-kit/actor';
import { fromCancelablePromiseFactory } from '@reactive-kit/actor-utils';
import type { AsyncTaskId } from '@reactive-kit/handler-utils';

import {
  createActHandlerDelayCompleteMessage,
  type ActHandlerDelayCompleteMessage,
} from '../messages';

export const TASK_TYPE_ACT_HANDLER_DELAY = '@reactive-kit/task/act-handler-delay';

export interface ActHandlerDelayTaskConfig {
  taskId: AsyncTaskId;
  durationMs: number;
  controller: AbortController;
  output: ActorHandle<ActHandlerDelayCompleteMessage>;
}

export type ActHandlerDelayTaskFactory = AsyncTaskFactory<
  ActHandlerDelayTaskConfig,
  never,
  ActHandlerDelayCompleteMessage
>;

export const ACT_HANDLER_DELAY_TASK: ActHandlerDelayTaskFactory = fromCancelablePromiseFactory<
  ActHandlerDelayTaskConfig,
  ActHandlerDelayCompleteMessage
>(TASK_TYPE_ACT_HANDLER_DELAY, (config) => {
  const { taskId, durationMs, controller, output } = config;
  const { signal } = controller;
  return {
    result: delay(durationMs, signal).then(() => [
      HandlerAction.Send({
        target: output,
        message: createActHandlerDelayCompleteMessage(taskId),
      }),
    ]),
    abort: controller,
  };
});

export function createActHandlerDelayTask(
  config: ActHandlerDelayTaskConfig,
): AsyncActorCreator<ActHandlerDelayTaskConfig, never, ActHandlerDelayCompleteMessage> {
  return {
    actor: ACT_HANDLER_DELAY_TASK,
    config,
  };
}

function delay(durationMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      resolve();
    }, durationMs);
    signal.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Delay aborted'));
    });
  });
}
