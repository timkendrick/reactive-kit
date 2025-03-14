import { type ActorHandle, type AsyncTaskFactory, HandlerAction } from '@reactive-kit/actor';
import { fromCancelablePromiseFactory } from '@reactive-kit/actor-utils';
import type { AsyncTaskId } from '@reactive-kit/handler-utils';
import type { FetchEffect } from '../effects';
import { createFetchHandlerResponseMessage, type FetchHandlerResponseMessage } from '../messages';
import { fetchRequest } from '../utils';

export const TASK_TYPE_FETCH = '@reactive-kit/task/fetch';

export interface FetchTaskConfig {
  taskId: AsyncTaskId;
  effect: FetchEffect;
  controller: AbortController;
  output: ActorHandle<FetchHandlerResponseMessage>;
}

export type FetchTaskFactory = AsyncTaskFactory<
  FetchTaskConfig,
  never,
  FetchHandlerResponseMessage
>;

export const FETCH_TASK: FetchTaskFactory = fromCancelablePromiseFactory<
  FetchTaskConfig,
  FetchHandlerResponseMessage
>(TASK_TYPE_FETCH, (config) => {
  const { taskId, effect, controller, output } = config;
  const { signal } = controller;
  return {
    result: fetchRequest(effect.payload, signal).then((response) => [
      HandlerAction.Send(output, createFetchHandlerResponseMessage(taskId, response)),
    ]),
    abort: controller,
  };
});
