import { type ActorHandle, type AsyncTaskFactory, HandlerAction } from '@reactive-kit/actor';
import { fromCancelablePromiseFactory } from '@reactive-kit/actor-utils';
import type { AsyncTaskId } from '@reactive-kit/handler-utils';
import type { FetchEffect } from '../effects';
import { createFetchHandlerResponseMessage, type FetchHandlerResponseMessage } from '../messages';
import { fetchRequest } from '../utils';

export function createFetchTask(
  taskId: AsyncTaskId,
  effect: FetchEffect,
  controller: AbortController,
  output: ActorHandle<FetchHandlerResponseMessage>,
): AsyncTaskFactory<never, FetchHandlerResponseMessage> {
  const { signal } = controller;
  return fromCancelablePromiseFactory<FetchHandlerResponseMessage>(() => ({
    result: fetchRequest(effect.payload, signal).then((response) => [
      HandlerAction.Send(output, createFetchHandlerResponseMessage(taskId, response)),
    ]),
    abort: controller,
  }));
}
