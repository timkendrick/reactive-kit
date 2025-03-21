import type { MatchState, Pattern, Predicate, RefHandle, TypeNarrowingPredicate } from '../types';

export interface WithRefsHelpers {
  createRef: CreateRefHelper;
  refPredicate: RefPredicateHelper;
  captureRef: CaptureRefHelper;
  retrieveRef: RetrieveRefHelper;
  ref: RefHelper;
}

interface CreateRefHelper {
  <T>(): RefHandle<T>;
}

interface RefPredicateHelper {
  <T>(predicate: Predicate<T>): Pattern<T>;
}

interface CaptureRefHelper {
  <T, V extends T>(ref: RefHandle<V>, predicate: TypeNarrowingPredicate<T, V>): Predicate<T>;
  <T>(ref: RefHandle<T>, predicate: Predicate<T>): Predicate<T>;
}

interface RetrieveRefHelper {
  <T>(ref: RefHandle<T>): T;
}

interface RefHelper {
  <T>(ref: RefHandle<T>): Predicate<T>;
}

export function withRefs<T>(factory: (helpers: WithRefsHelpers) => Pattern<T>): Pattern<T> {
  // Variable to hold the context for the currently executing refPredicate path.
  // This is dynamically scoped during the match process.
  let currentActiveRefContext: Map<RefHandle<unknown>, unknown> | null = null;

  // Stubs for the helper functions - implementation details will follow
  function createRef<V>(): RefHandle<V> {
    // Create a unique symbol to act as the handle for the reference.
    // Cast is needed because RefHandle is a branded type.
    return Symbol('ref') as RefHandle<V>;
  }

  function refPredicate<V>(userPredicate: Predicate<V>): Pattern<V> {
    // Return a Pattern object with a match method.
    return {
      match(state: MatchState<V>): Array<MatchState<V>> {
        // Check if there is an item to match at the current index.
        if (state.nextIndex >= state.input.length) {
          return []; // No item available, no match.
        }

        const value = state.input[state.nextIndex];
        // Back up the currently active context (might be null or from an outer scope).
        const previousActiveContext = currentActiveRefContext;
        // Create a new context for this specific evaluation path, copying the incoming state's context.
        // This isolates captures from parallel match attempts.
        const executionContext = new Map(state.refContext);

        try {
          // Set the dynamic context for this evaluation.
          currentActiveRefContext = executionContext;

          // Execute the user-provided predicate.
          const predicateResult = userPredicate(value);

          if (predicateResult) {
            // Match successful!
            // Return a new state with incremented index and the potentially modified context.
            return [
              {
                ...state,
                nextIndex: state.nextIndex + 1,
                // IMPORTANT: Use the executionContext which may contain new captures.
                refContext: executionContext,
              },
            ];
          } else {
            // Predicate returned false, no match on this path.
            return [];
          }
        } catch (e) {
          // Handle errors during predicate execution (e.g., ReferenceError from ref/retrieveRef)
          // Re-throw the error as per specification, indicating a hard failure.
          throw e;
        } finally {
          // CRITICAL: Always restore the previous context after evaluation completes.
          currentActiveRefContext = previousActiveContext;
        }
      },
    };
  }

  // Note: Implementation handles both overloads defined in WithRefsHelpers interface.
  function captureRef<T>(refHandle: RefHandle<T>, innerPredicate: Predicate<T>): Predicate<T> {
    // Return a predicate function.
    return (value: T): boolean => {
      // First, evaluate the inner predicate.
      const innerResult = innerPredicate(value);

      // Capture only if the inner predicate succeeds.
      if (innerResult) {
        // Ensure we are within the dynamic scope of a refPredicate.
        if (!currentActiveRefContext) {
          throw new ReferenceError('captureRef called outside of a refPredicate evaluation');
        }
        // Store the value in the currently active context map.
        currentActiveRefContext.set(refHandle, value);
      }

      // Return the result of the inner predicate.
      return innerResult;
    };
  }

  function retrieveRef<V>(refHandle: RefHandle<V>): V {
    if (!currentActiveRefContext) {
      // Should only be called within the dynamic scope set by refPredicate
      throw new ReferenceError('retrieveRef called outside of a refPredicate evaluation');
    }
    if (!currentActiveRefContext.has(refHandle)) {
      // The specific reference hasn't been captured on this execution path
      throw new ReferenceError('Reference has not been captured on this path');
    }
    // We trust the type based on how createRef and captureRef are used.
    return currentActiveRefContext.get(refHandle) as V;
  }

  function ref<V>(refHandle: RefHandle<V>): Predicate<V> {
    // Return a predicate function.
    return (value: V): boolean => {
      // Retrieve the captured value using the handle.
      // retrieveRef will throw if the handle isn't found in the current context.
      const capturedValue = retrieveRef(refHandle);
      // Perform a strict equality check.
      return value === capturedValue;
    };
  }

  // Create the helpers object to pass to the factory
  const helpers: WithRefsHelpers = {
    createRef,
    refPredicate,
    captureRef,
    retrieveRef,
    ref,
  };

  // Call the factory function provided by the user
  const pattern = factory(helpers);

  // Return the pattern created by the factory
  // The pattern's match method will need to manage the context
  return pattern;
}
