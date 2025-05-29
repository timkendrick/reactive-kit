/**
 * Splits an async iterator into two separate async iterators based on a predicate.
 *
 * One iterator emits values that satisfy the predicate, while the other emits values that do not.
 * If the input iterator is finalized with a value, both iterators will be finalized with that value.
 * If the input iterator is finalized with an error, both iterators will be finalized with that error.
 * @param input Unpartitioned async iterator
 * @returns A tuple of two async iterables, one for values that satisfy the predicate and one for values that do not.
 */
export function partitionAsyncIterator<T, TReturn>(
  input: AsyncIterator<T, TReturn, undefined>,
  predicate: (message: T) => boolean,
): [AsyncIterable<T, TReturn, undefined>, AsyncIterable<T, TReturn, undefined>] {
  interface PromiseFinalizer<T> {
    resolve: (result: T) => void;
    reject: (error: unknown) => void;
  }

  enum IteratorReturnStateType {
    NotReturned,
    Returned,
  }

  interface IteratorNotReturnedState {
    type: IteratorReturnStateType.NotReturned;
  }

  interface IteratorReturnedState<V> {
    type: IteratorReturnStateType.Returned;
    value: V;
  }

  type IteratorReturnState<V> = IteratorNotReturnedState | IteratorReturnedState<V>;

  interface PartitionedIteratorState {
    inputIterator: AsyncIterator<T, TReturn, undefined>;
    predicate: (message: T) => boolean;
    trueQueue: Array<T>;
    falseQueue: Array<T>;
    trueFinalizer: PromiseFinalizer<IteratorResult<T, TReturn>> | null;
    falseFinalizer: PromiseFinalizer<IteratorResult<T, TReturn>> | null;
    isPulling: boolean;
    inputState: PartitionedIteratorInputState<TReturn>;
    trueReturnState: IteratorReturnState<TReturn>;
    falseReturnState: IteratorReturnState<TReturn>;
  }

  enum PartitionedIteratorInputStateType {
    Active,
    Completed,
    Returned,
    Error,
  }

  interface PartitionedIteratorActiveInputState {
    type: PartitionedIteratorInputStateType.Active;
  }

  interface PartitionedIteratorCompletedInputState<V> {
    type: PartitionedIteratorInputStateType.Completed;
    value: V;
  }

  interface PartitionedIteratorReturnedInputState<V> {
    type: PartitionedIteratorInputStateType.Returned;
    value: V;
  }

  interface PartitionedIteratorErrorInputState {
    type: PartitionedIteratorInputStateType.Error;
    error: unknown;
  }

  type PartitionedIteratorInputState<V> =
    | PartitionedIteratorActiveInputState
    | PartitionedIteratorCompletedInputState<V>
    | PartitionedIteratorReturnedInputState<V>
    | PartitionedIteratorErrorInputState;

  const state: PartitionedIteratorState = {
    inputIterator: input,
    predicate,
    trueQueue: [],
    falseQueue: [],
    trueFinalizer: null,
    falseFinalizer: null,
    isPulling: false,
    inputState: { type: PartitionedIteratorInputStateType.Active },
    trueReturnState: { type: IteratorReturnStateType.NotReturned },
    falseReturnState: { type: IteratorReturnStateType.NotReturned },
  };

  const trueIterable: AsyncIterable<T, TReturn, undefined> = {
    [Symbol.asyncIterator](): AsyncIterator<T, TReturn, undefined> {
      return createFilteredIterator(
        state.trueQueue,
        (finalizer) => {
          state.trueFinalizer = finalizer;
        },
        () => state.trueReturnState,
        (value) => {
          state.trueReturnState = { type: IteratorReturnStateType.Returned, value };
        },
        awaitNextItem,
      );
    },
  };

  const falseIterable: AsyncIterable<T, TReturn, undefined> = {
    [Symbol.asyncIterator](): AsyncIterator<T, TReturn, undefined> {
      return createFilteredIterator(
        state.falseQueue,
        (finalizer) => {
          state.falseFinalizer = finalizer;
        },
        () => state.falseReturnState,
        (value) => {
          state.falseReturnState = { type: IteratorReturnStateType.Returned, value };
        },
        awaitNextItem,
      );
    },
  };

  return [trueIterable, falseIterable];

  function createFilteredIterator(
    queue: Array<T>,
    setFinalizer: (finalizer: PromiseFinalizer<IteratorResult<T, TReturn>>) => void,
    getReturnState: () => IteratorReturnState<TReturn>,
    setReturnState: (value: TReturn) => void,
    awaitNextItem: () => Promise<void>,
  ): AsyncIterator<T, TReturn, undefined> {
    return {
      async next(): Promise<IteratorResult<T, TReturn>> {
        // If this iterator was returned, always return its return value
        const returnState = getReturnState();
        if (returnState.type === IteratorReturnStateType.Returned) {
          return { value: returnState.value, done: true };
        }

        // Check queue for immediate value, even if there's an error
        // This ensures we emit all values that were queued before the error
        if (queue.length > 0) {
          return { value: queue.shift()!, done: false };
        }

        // Now check for error since we've exhausted the queue
        if (state.inputState.type === PartitionedIteratorInputStateType.Error) {
          return Promise.reject(state.inputState.error);
        }

        // Check for completed input
        if (state.inputState.type === PartitionedIteratorInputStateType.Completed) {
          return { value: state.inputState.value, done: true };
        }

        // Become a finalizer
        return new Promise((resolve, reject) => {
          const finalizer: PromiseFinalizer<IteratorResult<T, TReturn>> = { resolve, reject };

          // Double-check terminal states before registering finalizer
          if (state.inputState.type === PartitionedIteratorInputStateType.Error) {
            reject(state.inputState.error);
            return;
          }
          if (state.inputState.type === PartitionedIteratorInputStateType.Completed) {
            resolve({ value: state.inputState.value, done: true });
            return;
          }

          // Register finalizer
          setFinalizer(finalizer);

          // Signal that there's demand
          awaitNextItem();
        });
      },

      async return(value: TReturn): Promise<IteratorReturnResult<TReturn>> {
        // Clear this iterator's queue since we're abandoning iteration
        queue.length = 0;

        // Set this iterator's return state
        setReturnState(value);

        // If both iterators are returned, try to propagate return to the input iterator
        if (
          state.trueReturnState.type === IteratorReturnStateType.Returned &&
          state.falseReturnState.type === IteratorReturnStateType.Returned
        ) {
          // Use the most recently set return value
          const finalValue = value;

          if (state.inputState.type === PartitionedIteratorInputStateType.Active) {
            if (state.inputIterator.return) {
              try {
                await state.inputIterator.return(finalValue);
              } catch (error) {
                state.inputState = { type: PartitionedIteratorInputStateType.Error, error };
                throw error;
              }
            }
            state.inputState = {
              type: PartitionedIteratorInputStateType.Returned,
              value: finalValue,
            };
          }
        }

        return { value, done: true };
      },

      async throw(error: unknown): Promise<never> {
        // Set error state if not already in a terminal state
        if (state.inputState.type === PartitionedIteratorInputStateType.Active) {
          state.inputState = { type: PartitionedIteratorInputStateType.Error, error };

          // Try to propagate throw to the input iterator
          if (state.inputIterator.throw) {
            await state.inputIterator.throw(error);
          }
        }

        // Always throw the error
        throw error;
      },
    };
  }

  async function awaitNextItem(): Promise<void> {
    // If already pulling or no finalizers, return immediately
    if (state.isPulling || (!state.trueFinalizer && !state.falseFinalizer)) {
      return;
    }

    // If already done or errored, resolve/reject any finalizers and return
    if (state.inputState.type !== PartitionedIteratorInputStateType.Active) {
      if (state.trueFinalizer) {
        if (state.inputState.type === PartitionedIteratorInputStateType.Error) {
          state.trueFinalizer.reject(state.inputState.error);
        } else {
          state.trueFinalizer.resolve({ value: state.inputState.value, done: true });
        }
        state.trueFinalizer = null;
      }
      if (state.falseFinalizer) {
        if (state.inputState.type === PartitionedIteratorInputStateType.Error) {
          state.falseFinalizer.reject(state.inputState.error);
        } else {
          state.falseFinalizer.resolve({ value: state.inputState.value, done: true });
        }
        state.falseFinalizer = null;
      }
      return;
    }

    state.isPulling = true;

    try {
      const result = await state.inputIterator.next();

      if (result.done) {
        state.inputState = {
          type: PartitionedIteratorInputStateType.Completed,
          value: result.value,
        };

        if (state.trueFinalizer) {
          state.trueFinalizer.resolve({ value: result.value, done: true });
          state.trueFinalizer = null;
        }
        if (state.falseFinalizer) {
          state.falseFinalizer.resolve({ value: result.value, done: true });
          state.falseFinalizer = null;
        }
      } else {
        const isTrue = state.predicate(result.value);
        if (isTrue) {
          if (state.trueFinalizer) {
            state.trueFinalizer.resolve({ value: result.value, done: false });
            state.trueFinalizer = null;
          } else {
            state.trueQueue.push(result.value);
          }
        } else {
          if (state.falseFinalizer) {
            state.falseFinalizer.resolve({ value: result.value, done: false });
            state.falseFinalizer = null;
          } else {
            state.falseQueue.push(result.value);
          }
        }
      }
    } catch (error) {
      state.inputState = { type: PartitionedIteratorInputStateType.Error, error };
      if (state.trueFinalizer) {
        state.trueFinalizer.reject(error);
        state.trueFinalizer = null;
      }
      if (state.falseFinalizer) {
        state.falseFinalizer.reject(error);
        state.falseFinalizer = null;
      }
    } finally {
      state.isPulling = false;

      // Schedule another processing cycle if needed and not done/errored
      if (state.inputState.type === PartitionedIteratorInputStateType.Active) {
        Promise.resolve().then(() => awaitNextItem());
      }
    }
  }
}
