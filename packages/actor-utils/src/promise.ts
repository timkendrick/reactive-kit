import {
  AsyncTaskResult,
  AsyncTaskReturnResult,
  AsyncTaskFactory,
  HandlerAction,
  HandlerResult,
} from '@reactive-kit/actor';

export function fromPromiseFactory<T>(
  factory: () => Promise<HandlerResult<T>>,
): AsyncTaskFactory<never, T> {
  return (self) => {
    let activeOperation: Promise<AsyncTaskResult<T>> | undefined;
    let isCompleted = false;
    const DONE: AsyncTaskReturnResult<T> = {
      done: true,
      value: [HandlerAction.Kill(self)],
    };
    return {
      next(): Promise<AsyncTaskResult<T>> {
        if (isCompleted) return Promise.resolve(DONE);
        if (activeOperation) return activeOperation;
        const operation = factory();
        activeOperation = operation.then((value) => {
          activeOperation = undefined;
          isCompleted = true;
          return { done: false, value };
        });
        return activeOperation;
      },
      return(): Promise<AsyncTaskResult<T>> {
        if (isCompleted) return Promise.resolve(DONE);
        isCompleted = true;
        activeOperation = undefined;
        return Promise.resolve(DONE);
      },
      throw(): Promise<AsyncTaskResult<T>> {
        if (isCompleted) return Promise.resolve(DONE);
        isCompleted = true;
        activeOperation = undefined;
        return Promise.resolve(DONE);
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
    let isCompleted = false;
    const DONE: AsyncTaskReturnResult<T> = {
      done: true,
      value: [HandlerAction.Kill(self)],
    };
    return {
      next(): Promise<AsyncTaskResult<T>> {
        if (isCompleted) return Promise.resolve(DONE);
        if (activeOperation) return activeOperation.result;
        const operation = factory();
        activeOperation = {
          result: operation.result.then((value) => {
            activeOperation = undefined;
            isCompleted = true;
            return { done: false, value };
          }),
          abort: operation.abort,
        };
        return activeOperation.result;
      },
      return(): Promise<AsyncTaskResult<T>> {
        if (isCompleted) return Promise.resolve(DONE);
        isCompleted = true;
        if (activeOperation) {
          activeOperation.abort.abort();
          activeOperation = undefined;
        }
        return Promise.resolve(DONE);
      },
      throw(): Promise<AsyncTaskResult<T>> {
        if (isCompleted) return Promise.resolve(DONE);
        isCompleted = true;
        if (activeOperation) {
          activeOperation.abort.abort();
          activeOperation = undefined;
        }
        return Promise.resolve(DONE);
      },
    };
  };
}
