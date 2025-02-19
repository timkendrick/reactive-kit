import { ActorHandle, AsyncTaskFactory, HandlerAction } from '@reactive-kit/actor';
import { FetchEffect } from '../effects';
import {
  createFetchHandlerResponseMessage,
  FetchHandlerResponseMessage,
  TaskId,
} from '../messages';
import { fromCancelablePromiseFactory } from '@reactive-kit/actor-utils';
import { fetchRequest } from '../utils';

export function createFetchTask(
  taskId: TaskId,
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
