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
