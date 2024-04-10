import {
  AsyncTaskResult,
  AsyncTaskReturnResult,
  AsyncTaskFactory,
  HandlerAction,
  HandlerResult,
} from '@reactive-kit/actor';

interface AsyncIteratorOperation<T> {
  iterator: AsyncIterator<T, T>;
  current: Promise<IteratorResult<T, T>> | null;
}

export function fromAsyncIteratorFactory<T>(
  factory: () => AsyncIterator<HandlerResult<T>, HandlerResult<T>>,
): AsyncTaskFactory<never, T> {
  return (self) => {
    let activeOperation: AsyncIteratorOperation<HandlerResult<T>> | undefined;
    let isCompleted = false;
    const DONE: AsyncTaskReturnResult<T> = {
      done: true,
      value: [HandlerAction.Kill(self)],
    };
    return {
      next(): Promise<AsyncTaskResult<T>> {
        if (isCompleted) return Promise.resolve(DONE);
        if (activeOperation?.current) return activeOperation.current;
        if (!activeOperation) {
          activeOperation = ((operation): AsyncIteratorOperation<HandlerResult<T>> => ({
            iterator: operation,
            current: null,
          }))(factory());
        }
        const current: Promise<IteratorResult<HandlerResult<T>, HandlerResult<T>>> =
          activeOperation.iterator.next().then((result) => {
            if (isCompleted) return DONE;
            if (result.done) {
              const actions = result.value;
              activeOperation = undefined;
              isCompleted = true;
              return actions == null
                ? DONE
                : { done: true, value: [...actions, HandlerAction.Kill(self)] };
            } else {
              const actions = result.value;
              if (activeOperation?.current === current) activeOperation.current = null;
              return { done: false, value: actions };
            }
          });
        return (activeOperation.current = current);
      },
      return(): Promise<AsyncTaskResult<T>> {
        if (isCompleted) return Promise.resolve(DONE);
        isCompleted = true;
        if (activeOperation) activeOperation.iterator.return?.();
        return Promise.resolve(DONE);
      },
      throw(): Promise<AsyncTaskResult<T>> {
        if (isCompleted) return Promise.resolve(DONE);
        isCompleted = true;
        if (activeOperation) activeOperation.iterator.throw?.();
        return Promise.resolve(DONE);
      },
    };
  };
}
