import type { Stream, StreamSink, StreamTransform, UnsubscribeCallback } from '@trigger/types';

export function input<T>(): StreamSink<T> & Stream<T> {
  const sinks = new Array<StreamSink<T>>();
  let latestValue: T;
  let hasEmitted = false;
  return {
    subscribe(sink) {
      let isUnsubscribed = false;
      sinks.push(sink);
      if (!hasEmitted) return unsubscribe;
      sink.next(latestValue);
      return unsubscribe;
      function unsubscribe(): void {
        if (isUnsubscribed) return;
        isUnsubscribed = true;
        sinks.splice(sinks.indexOf(sink), 1);
      }
    },
    next(value) {
      hasEmitted = true;
      latestValue = value;
      for (const sink of sinks) {
        sink.next(value);
      }
    },
  };
}

export function fromPromise<T, E = unknown>(
  factory: () => Promise<T>,
): Stream<{ success: true; value: T } | { success: false; error: E }> {
  return {
    subscribe(sink) {
      let isUnsubscribed = false;
      factory().then(
        (value) => {
          if (isUnsubscribed) return;
          sink.next({ success: true, value });
        },
        (error) => {
          if (isUnsubscribed) return;
          sink.next({ success: false, error });
        },
      );
      return unsubscribe;
      function unsubscribe(): void {
        if (isUnsubscribed) return;
        isUnsubscribed = true;
      }
    },
  };
}

export function map<I, O>(transform: (value: I) => O): StreamTransform<I, O> {
  return (input) => {
    const sinks = new Array<StreamSink<O>>();
    let subscription: UnsubscribeCallback | null = null;
    return {
      subscribe(sink) {
        let isUnsubscribed = false;
        sinks.push(sink);
        if (subscription) return unsubscribe;
        subscription = input.subscribe({
          next(value) {
            const transformedValue = transform(value);
            for (const sink of sinks) {
              sink.next(transformedValue);
            }
          },
        });
        return unsubscribe;
        function unsubscribe(): void {
          if (isUnsubscribed) return;
          isUnsubscribed = true;
          sinks.splice(sinks.indexOf(sink), 1);
          if (sinks.length > 0) return;
          const previousSubscription = subscription;
          subscription = null;
          if (previousSubscription) previousSubscription();
        }
      },
    };
  };
}

export function filter<I, V extends I>(predicate: (value: I) => value is V): StreamTransform<I, V>;
export function filter<I>(predicate: (value: I) => boolean): StreamTransform<I, I>;
export function filter<I>(predicate: (value: I) => boolean): StreamTransform<I, I> {
  return (input) => {
    const sinks = new Array<StreamSink<I>>();
    let subscription: UnsubscribeCallback | null = null;
    return {
      subscribe(sink) {
        let isUnsubscribed = false;
        sinks.push(sink);
        if (subscription) return unsubscribe;
        subscription = input.subscribe({
          next(value) {
            if (!predicate(value)) return;
            for (const sink of sinks) {
              sink.next(value);
            }
          },
        });
        return unsubscribe;
        function unsubscribe(): void {
          if (isUnsubscribed) return;
          isUnsubscribed = true;
          sinks.splice(sinks.indexOf(sink), 1);
          if (sinks.length > 0) return;
          const previousSubscription = subscription;
          subscription = null;
          if (previousSubscription) previousSubscription();
        }
      },
    };
  };
}

export function pipe<I, O>(input: Stream<I>, transform: StreamTransform<I, O>): Stream<O> {
  return transform(input);
}

export function flow<I1, I2, O>(
  left: StreamTransform<I1, I2>,
  right: StreamTransform<I2, O>,
): StreamTransform<I1, O> {
  return (input) => right(left(input));
}
