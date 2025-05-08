import {
  HandlerAction,
  type AsyncTaskFactory,
  type AsyncTaskInbox,
  type AsyncTaskOutbox,
  type AsyncTaskType,
  type HandlerResult,
} from '@reactive-kit/actor';

export function fromPromiseFactory<C, T>(
  type: AsyncTaskType,
  factory: (config: C) => Promise<HandlerResult<T>>,
): AsyncTaskFactory<C, never, T> {
  return {
    type,
    async: true,
    factory: (config, self) => {
      return async function (_inbox: AsyncTaskInbox<T>, outbox: AsyncTaskOutbox<T>): Promise<void> {
        // Await the promise
        const result = await factory(config);
        // Emit the result of the promise to the outbox and terminate the task
        outbox(result ? [...result, HandlerAction.Kill(self)] : [HandlerAction.Kill(self)]);
      };
    },
  };
}

interface CancelablePromise<T> {
  result: Promise<T>;
  abort: AbortController;
}

export function fromCancelablePromiseFactory<C, T>(
  type: AsyncTaskType,
  factory: (config: C) => CancelablePromise<HandlerResult<T>>,
): AsyncTaskFactory<C, never, T> {
  return fromPromiseFactory(type, (config) => {
    // FIXME: Support promise cancellation in async tasks
    const { result, abort: _ } = factory(config);
    return result;
  });
}
