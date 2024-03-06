import { Enum, EnumVariant, VARIANT, instantiateEnum } from './enumHelpers';

export async function subscribeAsyncIterator<T, V>(
  source: AsyncIterator<T, V, undefined>,
  callback: (value: T) => void,
): Promise<V> {
  while (true) {
    const result = await source.next();
    if (result.done) return result.value;
    callback(result.value);
  }
}

// The queue can either be blocked on subscribers or on values, so model the state accordingly
const enum AsyncQueueStateType {
  AwaitingSubscribers,
  AwaitingValues,
  Completed,
}
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
function AwaitingSubscribers<T>(options: {
  values: Array<T>;
}): EnumVariant<AsyncQueueState<T>, AsyncQueueStateType.AwaitingSubscribers> {
  return instantiateEnum(AsyncQueueStateType.AwaitingSubscribers, options);
}
function AwaitingValues<T>(options: {
  subscribers: Array<(value: IteratorResult<T, null>) => void>;
}): EnumVariant<AsyncQueueState<T>, AsyncQueueStateType.AwaitingValues> {
  return instantiateEnum(AsyncQueueStateType.AwaitingValues, options);
}
function Completed<T>(): EnumVariant<AsyncQueueState<T>, AsyncQueueStateType.Completed> {
  return instantiateEnum(AsyncQueueStateType.Completed, {});
}

export class AsyncQueue<T> implements AsyncIterator<T, null> {
  private static DONE: IteratorReturnResult<null> = { done: true, value: null };
  private state: AsyncQueueState<T> = AwaitingValues({ subscribers: [] });
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
          this.state = AwaitingSubscribers({ values: [value] });
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
          this.state = AwaitingValues({ subscribers: [] });
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
        this.state = Completed();
        break;
      }
      case AsyncQueueStateType.AwaitingValues: {
        this.state = Completed();
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
