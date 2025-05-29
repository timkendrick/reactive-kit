import { Enum, VARIANT, type GenericEnum } from './enum';

export interface AsyncTrigger<T> {
  signal: Promise<T>;
  emit: (value: T) => void;
}

export function createAsyncTrigger<T>(): AsyncTrigger<T> {
  let emit: (value: T) => void;
  const signal = new Promise<T>((resolve) => {
    emit = resolve;
  });
  return { signal, emit: emit! };
}

export function subscribeAsyncIterator<T, V>(
  source: AsyncIterator<T, V, undefined>,
  callback: (value: T) => void | PromiseLike<void>,
): Promise<V> {
  return new Promise<V>((resolve, reject) => {
    return next();

    function next(): void {
      source.next().then((result) => {
        if (result.done) {
          resolve(result.value);
        } else {
          Promise.resolve(callback(result.value)).then(() => next());
        }
      }, reject);
    }
  });
}

// The queue can either be blocked on subscribers or on values, so model the state accordingly
type AsyncQueueState<T> = Enum<{
  [AsyncQueueStateType.AwaitingSubscribers]: {
    // 'push' queue (values awaiting retrieval)
    values: Array<T>;
  };
  [AsyncQueueStateType.AwaitingValues]: {
    // 'pull' queue (subscribers awaiting values)
    subscribers: Array<(value: IteratorResult<T, null>) => void>;
  };
  [AsyncQueueStateType.Completed]: void;
}>;
const enum AsyncQueueStateType {
  AwaitingSubscribers = 'AwaitingSubscribers',
  AwaitingValues = 'AwaitingValues',
  Completed = 'Completed',
}
interface GenericAsyncQueueState extends GenericEnum<1> {
  instance: AsyncQueueState<this['T1']>;
}
const AsyncQueueState = Enum.create<GenericAsyncQueueState>({
  [AsyncQueueStateType.AwaitingSubscribers]: true,
  [AsyncQueueStateType.AwaitingValues]: true,
  [AsyncQueueStateType.Completed]: true,
});

export class AsyncQueue<T> implements AsyncIterator<T, null> {
  private static DONE: IteratorReturnResult<null> = { done: true, value: null };
  private state: AsyncQueueState<T> = AsyncQueueState.AwaitingValues({ subscribers: [] });
  public push(value: T): void {
    const state = this.state;
    switch (state[VARIANT]) {
      case AsyncQueueStateType.AwaitingSubscribers: {
        state.values.push(value);
        break;
      }
      case AsyncQueueStateType.AwaitingValues: {
        const subscriber = state.subscribers.shift();
        if (subscriber) {
          // If there are subscribers queued, emit the value to the next subscriber
          subscriber({ done: false, value });
        } else {
          // Otherwise queue the value to be emitted once the next subscriber comes along
          this.state = AsyncQueueState.AwaitingSubscribers({ values: [value] });
        }
        break;
      }
      case AsyncQueueStateType.Completed: {
        return;
      }
    }
  }
  public next(): Promise<IteratorResult<T, null>> {
    const state = this.state;
    switch (state[VARIANT]) {
      case AsyncQueueStateType.AwaitingSubscribers: {
        // If there are values queued, emit the next queued value
        const value = state.values.shift()!;
        const isFinalQueuedValue = state.values.length === 0;
        if (isFinalQueuedValue) {
          this.state = AsyncQueueState.AwaitingValues({ subscribers: [] });
        }
        return Promise.resolve({ done: false, value });
      }
      case AsyncQueueStateType.AwaitingValues: {
        // Otherwise if there are no values queued, add the subscriber to the queue
        const subscribers = state.subscribers;
        return new Promise<IteratorResult<T, null>>((resolve) => {
          subscribers.push(resolve);
        });
      }
      case AsyncQueueStateType.Completed: {
        return Promise.resolve(AsyncQueue.DONE);
      }
    }
  }
  public return(): Promise<IteratorReturnResult<null>> {
    const state = this.state;
    switch (state[VARIANT]) {
      case AsyncQueueStateType.AwaitingSubscribers: {
        this.state = AsyncQueueState.Completed();
        break;
      }
      case AsyncQueueStateType.AwaitingValues: {
        this.state = AsyncQueueState.Completed();
        for (const subscriber of state.subscribers) {
          subscriber(AsyncQueue.DONE);
        }
        break;
      }
      case AsyncQueueStateType.Completed: {
        break;
      }
    }
    return Promise.resolve(AsyncQueue.DONE);
  }
}
