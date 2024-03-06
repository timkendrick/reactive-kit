import {
  ActorHandle,
  AsyncTaskResult,
  AsyncTaskReturnResult,
  AsyncTaskFactory,
  HandlerAction,
  HandlerActionType,
  HandlerContext,
  HandlerResult,
  SyncActor,
} from '@trigger/types';

export function fromPromiseFactory<T>(
  factory: () => Promise<HandlerResult<T>>,
): AsyncTaskFactory<never, T> {
  return (self) => {
    let activeOperation: Promise<AsyncTaskResult<T>> | undefined;
    let emitted = false;
    const DONE: AsyncTaskReturnResult<T> = {
      done: true,
      value: [HandlerAction[HandlerActionType.Kill](self)],
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
      value: [HandlerAction[HandlerActionType.Kill](self)],
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

export class BroadcastActor<T> implements SyncActor<T> {
  private targets: Array<ActorHandle<T>> = [];
  public constructor(targets: Iterable<ActorHandle<T>>) {
    for (const target of targets) {
      this.targets.push(target);
    }
  }

  public handle(message: T, context: HandlerContext<T>): HandlerResult<unknown> {
    return this.targets.map((target) => HandlerAction[HandlerActionType.Send](target, message));
  }
}

export interface PipedHandler<I, O> {
  (next: ActorHandle<O>): ActorHandle<I>;
}

export function chain<I, T1, T2>(left: PipedHandler<I, T1>, right: PipedHandler<T1, T2>) {
  return (next: ActorHandle<T2>): ActorHandle<I> => left(right(next));
}

export class MapActor<T, T2> implements SyncActor<T> {
  private iteratee: (message: T) => T2;
  private next: ActorHandle<T2>;

  public constructor(iteratee: (message: T) => T2, next: ActorHandle<T2>) {
    this.iteratee = iteratee;
    this.next = next;
  }

  public handle(message: T, context: HandlerContext<T>): HandlerResult<T2> {
    return [HandlerAction.Send(this.next, this.iteratee(message))];
  }
}

export class FilterActor<T, T2 extends T = T> implements SyncActor<T> {
  private predicate: (message: T) => message is T2;
  private next: ActorHandle<T2>;

  public constructor(predicate: (message: T) => message is T2, next: ActorHandle<T2>);
  public constructor(predicate: (message: T) => boolean, next: ActorHandle<T2>);
  public constructor(predicate: (message: T) => message is T2, next: ActorHandle<T2>) {
    this.predicate = predicate;
    this.next = next;
  }

  public handle(message: T, context: HandlerContext<T>): HandlerResult<T2> {
    if (!this.predicate(message)) return null;
    return [HandlerAction.Send(this.next, message)];
  }
}

export class FlatMapActor<T, T2> implements SyncActor<T> {
  private iteratee: (message: T) => Array<T2>;
  private next: ActorHandle<T2>;

  public constructor(iteratee: (message: T) => Array<T2>, next: ActorHandle<T2>) {
    this.iteratee = iteratee;
    this.next = next;
  }

  public handle(message: T, context: HandlerContext<T>): HandlerResult<T2> {
    return this.iteratee(message).map((message) => HandlerAction.Send(this.next, message));
  }
}

export class ScanActor<T, S> implements SyncActor<T> {
  private state: S;
  private reducer: (state: S, action: T) => S;
  private next: ActorHandle<S>;

  public constructor(initialState: S, reducer: (state: S, action: T) => S, next: ActorHandle<S>) {
    this.state = initialState;
    this.reducer = reducer;
    this.next = next;
  }

  public handle(message: T, context: HandlerContext<T>): HandlerResult<S> {
    const result = this.reducer(this.state, message);
    this.state = result;
    return [HandlerAction.Send(this.next, result)];
  }
}
