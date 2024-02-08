export interface Stream<T> {
  subscribe(sink: StreamSink<T>): UnsubscribeCallback;
}

export interface UnsubscribeCallback {
  (): void;
}

export interface StreamSink<T> {
  next(value: T): void;
}

export interface StreamTransform<I, O> {
  (input: Stream<I>): Stream<O>;
}
