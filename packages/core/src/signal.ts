import { PollStatus, SIGNAL, type Signal, type StateToken } from '@trigger/types';
import { hash } from './hash';

export function createSignal<T>(id: StateToken, next: () => PollStatus<T>): Signal<T> {
  return {
    [SIGNAL]: id,
    poll: next,
  };
}

export function never<T>(): Signal<T> {
  const status = PollStatus.Pending<T>(null);
  return createSignal(hash('@trigger::never'), () => status);
}

export function once<T>(value: T): Signal<T> {
  const status = PollStatus.Ready(value);
  return createSignal(hash('@trigger::constant', value), () => status);
}

/*
export function chain<T>(left: Signal<T>, right: Signal<T>): Signal<T> {
  let leftDone = false;
  return createSignal(hash('@trigger::chain', left[SIGNAL], right[SIGNAL]), () => {
    if (!leftDone) {
      const result = left.poll();
      if (PollStatus.Pending.is(result)) return result;
      if (PollStatus.Done.is(result)) {
        leftDone = true;
        return right.poll();
      }
      return result;
    }
    return right.poll();
  });
}

export function take<T>(input: Signal<T>, count: number): Signal<T> {
  let numRemaining = count;
  return createSignal(hash('@trigger::take', input, count), () => {
    if (numRemaining <= 0) return PollStatus.Done();
    const result = input.poll();
    if (PollStatus.Pending.is(result)) return result;
    if (PollStatus.Done.is(result)) {
      numRemaining = 0;
      return result;
    }
    numRemaining--;
    return result;
  });
}

export function skip<T>(input: Signal<T>, count: number): Signal<T> {
  let numRemaining = count;
  return createSignal(hash('@trigger::skip', input, count), () => {
    while (numRemaining > 0) {
      const result = input.poll();
      if (PollStatus.Pending.is(result)) return result;
      if (PollStatus.Done.is(result)) {
        numRemaining = 0;
        return result;
      }
      numRemaining--;
    }
    return input.poll();
  });
}

export function map<T, V>(input: Signal<T>, transform: (value: T) => V): Signal<V> {
  return createSignal(hash('@trigger::map', input, transform), () => {
    const result = input.poll();
    if (PollStatus.Pending.is(result) || PollStatus.Done.is(result)) return result;
    return PollStatus.Ready(transform(result.value));
  });
}

export function flatMap<T, V>(input: Signal<T>, transform: (value: T) => Signal<V>): Signal<V> {
  let current: Signal<V> | null = null;
  return createSignal(hash('@trigger::flatMap', input, transform), () => {
    while (true) {
      if (!current) {
        const result = input.poll();
        if (PollStatus.Pending.is(result) || PollStatus.Done.is(result)) return result;
        current = transform(result.value);
      }
      const result = current.poll();
      if (PollStatus.Pending.is(result)) return result;
      if (PollStatus.Done.is(result)) {
        current = null;
        continue;
      }
      return result;
    }
  });
}
*/
