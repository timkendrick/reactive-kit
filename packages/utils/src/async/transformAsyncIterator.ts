/**
 * Transforms an async iterator by applying a function to each value.
 *
 * If the input iterator is finalized with a value, the output iterator will be finalized with that value.
 * If the input iterator is finalized with an error, the output iterator will be finalized with that error.
 * @param input - The input async iterator to transform.
 * @param transform - A function that transforms the input value to a new value.
 * @returns A new async iterator that transforms the input value to a new value.
 */
export function transformAsyncIterator<T, V, TReturn, TNext>(
  input: AsyncIterator<T, TReturn, TNext>,
  transform: (value: T) => V,
): AsyncIterator<V, TReturn, TNext> {
  return {
    async next(...args: [] | [TNext]): Promise<IteratorResult<V, TReturn>> {
      const result = await input.next(...args);

      if (result.done) {
        // Iterator is done, return the final value without transformation
        return { done: true, value: result.value };
      } else {
        // Iterator is not done, transform the yielded value
        const transformedValue = transform(result.value);
        return { done: false, value: transformedValue };
      }
    },

    async return(value?: TReturn | PromiseLike<TReturn>): Promise<IteratorResult<V, TReturn>> {
      if (typeof input.return === 'function') {
        const result = await input.return(value);
        return result as IteratorReturnResult<TReturn>;
      } else {
        return { done: true, value: (await value) as TReturn };
      }
    },

    async throw(error?: unknown): Promise<IteratorResult<V, TReturn>> {
      if (typeof input.throw === 'function') {
        const result = await input.throw(error);
        if (result.done) {
          return result as IteratorReturnResult<TReturn>;
        } else {
          // If throw returns a yielded value, we need to transform it
          const transformedValue = transform(result.value);
          return { done: false, value: transformedValue };
        }
      } else {
        throw error;
      }
    },
  };
}
