import {
  ActorHandle,
  AsyncTaskResult,
  AsyncTaskReturnResult,
  AsyncTaskFactory,
  HandlerAction,
  HandlerActionType,
  HandlerContext,
  HandlerResult,
  Actor,
} from '@trigger/types';

export function fromPromiseFactory<T>(
  factory: () => Promise<HandlerResult<T>>,
): AsyncTaskFactory<never, T> {
  return (self) => {
    let activeOperation: Promise<AsyncTaskResult<T>> | undefined;
    let emitted = false;
    const DONE: AsyncTaskReturnResult<T> = {
      done: true,
      value: [HandlerAction.Kill(self)],
    };
    return {
      next(message?): Promise<AsyncTaskResult<T>> {
        if (emitted) return Promise.resolve(DONE);
        if (activeOperation) return activeOperation;
        const operation = factory();
        activeOperation = operation.then((value) => {
          activeOperation = undefined;
          emitted = true;
          return { done: false, value };
        });
        return activeOperation;
      },
    };
  };
}

interface CancelablePromise<T> {
  result: Promise<T>;
  abort: AbortController;
}

export function fromCancelablePromiseFactory<T>(
  factory: () => CancelablePromise<HandlerResult<T>>,
): AsyncTaskFactory<never, T> {
  return (self) => {
    let activeOperation: CancelablePromise<AsyncTaskResult<T>> | undefined;
    let emitted = false;
    const DONE: AsyncTaskReturnResult<T> = {
      done: true,
      value: [HandlerAction.Kill(self)],
    };
    return {
      next(message?): Promise<AsyncTaskResult<T>> {
        if (emitted) return Promise.resolve(DONE);
        if (activeOperation) return activeOperation.result;
        const operation = factory();
        activeOperation = {
          result: operation.result.then((value) => {
            activeOperation = undefined;
            emitted = true;
            return { done: false, value };
          }),
          abort: operation.abort,
        };
        return activeOperation.result;
      },
    };
  };
}
