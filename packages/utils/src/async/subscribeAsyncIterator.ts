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
