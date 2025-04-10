## Capture and Reference

The capture and reference system allows patterns to capture values during predicate matching and reference them in later parts of the pattern or even within the same predicate evaluation, enabling complex verification of related values within a test sequence.

### Reference Context and Bound Helpers

The `withRefs` helper function establishes a lexical scope for managing captures. It provides a set of bound helper functions that operate within this scope:

```typescript
import { withRefs, capture, lazy, sequence, /* ... other imports */ } from "@reactive-kit/test-utils";

// withRefs takes a factory function receiving bound helpers
const pattern = withRefs((helpers) => {
  // Destructure the bound helpers for use within this scope
  const { createRef, refPredicate, capture, ref, retrieveRef } = helpers;

  // 1. Create capture variables using createRef
  const taskHandle = createRef<ActorHandle>();
  const resultValue = createRef<any>();

  // 2. Use the bound 'refPredicate' helper to bridge into pattern world
  return sequence([
    refPredicate(
      // 3. Use 'capture' inside other predicates to capture values
      // Here, capture the handle if it matches sentTo(any())
      and( // Example combining multiple predicates
        hasActionType(HandlerActionType.Spawn),
        // capture takes the ref and the inner predicate for the value
        sentTo(capture(taskHandle, any()))
      )
    ),
    refPredicate(
      and( // Example combining multiple predicates
        hasMessageType(MESSAGE_RESULT),
        // 4. Use the bound 'ref' predicate for direct equality match against captured value
        sentFrom(ref(taskHandle)), // ref(taskHandle) compares input handle === captured handle
        // Capture the message payload if other predicates match
        hasMessagePayload(capture(resultValue, any())),
        // 5. Use 'retrieveRef' within 'lazy' for complex checks
        hasField('correlationId', lazy(id => id === retrieveRef(taskHandle).id + '_result'))
      )
    )
  ]);
});
```

**Bound Helpers (provided by `withRefs`):**

*   `createRef<V>(): RefAccessor<V>`: Creates a unique, typed identifier for a value within the `withRefs` scope.
*   `ref(variable: RefAccessor<V>): Predicate<V>`: A predicate that performs a direct equality comparison between the input value and the currently captured value for `variable` (equivalent to `lazy(value => value === retrieveRef(variable))`). Throws `ReferenceError` if the variable has not been captured on the current path.
*   `capture<V>(variable: RefAccessor<V>, innerPredicate: Predicate<V>): Predicate<V>`: A predicate that first evaluates `innerPredicate`. If true, it captures the input value into `variable` (within the current context) and returns true. Otherwise, returns false without capturing.
*   `retrieveRef<V>(variable: RefAccessor<V>): V`: Directly retrieves the currently captured value associated with `variable` from the context. Throws `ReferenceError` if the variable has not been captured on the current path. Useful within `lazy` or custom predicate functions.
*   `refPredicate(userPredicate: Predicate<T>): Pattern<T>`: Lifts a standard predicate function (`userPredicate`) into a pattern that consumes one item. It manages the context for `ref`, `capture`, and `retrieveRef` calls within `userPredicate`.

**General Predicate Combinators (available globally):**

*   `lazy<T>(factory: (value: T) => boolean): Predicate<T>`: A standard predicate combinator that defers the execution of the `factory` function until the predicate is evaluated. The `factory` receives the input value and computes the boolean result, often using `retrieveRef` to access captured values just-in-time.

### Value Capture (`capture`)

The bound `capture` helper is used *within* other predicates to capture the value being tested by that part of the predicate chain, if the inner predicate matches.

```typescript
import { withRefs, capture, lazy, sequence, /* ... other imports */ } from "@reactive-kit/test-utils";

withRefs((helpers) => {
  const { createRef, refPredicate, capture, equals, hasField, any } = helpers;
  const countRef = createRef<number>();
  const statusRef = createRef<string>();

  return sequence([
    // Capture the 'count' field if it equals 1
    refPredicate(
      hasField("count", capture(countRef, equals(1)))
    ),
    // Capture the 'status' field if it's any string
    refPredicate(
      hasField("status", capture(statusRef, any())) // Assuming any() is a predicate
    )
  ]);
})
```

### Back-References (`ref` and `retrieveRef`)

Use the bound `ref` predicate for direct equality comparisons. Use the bound `retrieveRef` helper within `lazy` or custom predicate functions for more complex comparisons or value access.

```typescript
import { withRefs, capture, lazy, sequence, /* ... other imports */ } from "@reactive-kit/test-utils";

withRefs((helpers) => {
  const { createRef, refPredicate, capture, ref, retrieveRef, equals, hasField, sentFrom } = helpers;
  const taskHandle = createRef<ActorHandle>();

  return sequence([
    // Capture the handle
    refPredicate(sentTo(capture(taskHandle, any()))),

    // Match a later item sent FROM the captured handle (direct equality)
    refPredicate(sentFrom(ref(taskHandle))), // ref(taskHandle) compares input handle === captured handle

    // Match an item where field 'taskId' equals the captured handle's ID (complex comparison)
    refPredicate(
      hasField(
        'taskId',
        // Use lazy + retrieveRef to access property for comparison
        lazy(taskIdValue => taskIdValue === retrieveRef(taskHandle).id)
      )
    )
  ]);
})
```

### Complex Reference Patterns

Combine captures and references to verify relationships across sequences.

```typescript
import { withRefs, capture, lazy, sequence, /* ... other imports */ } from "@reactive-kit/test-utils";

withRefs((helpers) => {
  const { createRef, refPredicate, capture, ref, retrieveRef, and } = helpers;

  const childHandle = createRef<ActorHandle>();
  const result = createRef<any>();

  return sequence([
    // Capture child handler's handle when it's spawned
    refPredicate(and(
      hasActionType(HandlerActionType.Spawn),
      hasSpawnHandlerType(ChildHandler),
      // Capture the target handle if the action matches
      sentTo(capture(childHandle, any()))
    )),

    // Verify parent -> child initialize message uses the captured handle
    refPredicate(and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_INITIALIZE),
      sentTo(ref(childHandle)) // Use ref predicate for direct equality
    )),

    // Verify child -> parent ready message comes from the captured handle
    // and capture the result payload
    refPredicate(and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_READY),
      sentFrom(ref(childHandle)), // Use ref predicate for direct equality
      hasMessagePayload(capture(result, any())) // Capture the payload
    ))
  ]);
})
```

### State Verification with Captures

Verify state transitions using captures and references.

```typescript
import { withRefs, capture, lazy, sequence, /* ... other imports */ } from "@reactive-kit/test-utils";

withRefs((helpers) => {
  const { createRef, refPredicate, capture, ref, retrieveRef, and } = helpers;

  const state1Count = createRef<number>();

  return sequence([
    // Capture initial state's count field
    refPredicate(and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_INCREMENT),
      hasResultingState(
        // Use hasField to target the 'count', then capture if it equals 1
        hasField("count", capture(state1Count, equals(1)))
      )
    )),

    // Verify state changed correctly using the captured count
    refPredicate(and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_INCREMENT),
      hasResultingState(and(
        // Use retrieveRef within lazy for calculation
        hasField("count", lazy((n: number) => n === retrieveRef(state1Count) + 1)),
        hasField("status", equals("updated"))
      ))
    ))
  ]);
})
```

### Implementation Details

The `withRefs` helper creates a context responsible for managing capture variables and their state during matching.

1.  **Context Creation:** `withRefs` initializes a `PatternContext` instance specific to its scope.
2.  **Bound Helpers:** It creates instances of `createRef`, `ref`, `capture`, `retrieveRef`, and `refPredicate` that are bound to this `PatternContext` via closures.
3.  **`MatchState.captures`:** The `MatchState` needs to store captured values associated with `RefAccessor` identifiers. A `Map` is suitable:
    ```typescript
    export interface MatchState<T> {
      input: Array<T>;
      nextIndex: number;
      // Map from RefAccessor ID to captured value for this path
      captures: ReadonlyMap<RefHandle<unknown>, unknown>;
    }
    ```
4.  **`refPredicate` Helper Role:** The bound `refPredicate(userPredicate)` helper acts as the primary interface to the context.
    *   **Before `userPredicate`:** It prepares a temporary, mutable buffer for new captures and makes the `state.captures` available for read access via `retrieveRef` (and implicitly by `ref`).
    *   **During `userPredicate`:** Calls to `capture` update the temporary buffer immediately if their inner predicate succeeds. Calls to `ref` or `retrieveRef` read first from the buffer, then from the incoming `state.captures`.
    *   **After `userPredicate`:** If `userPredicate` returns true, the `refPredicate` helper merges the buffer contents with `state.captures` to create the `captures` map for the *new* `MatchState`.
5.  **Context Management:** The `PatternContext` manages the lifecycle of the read-only inherited captures and the writeable temporary buffer during the execution of each `refPredicate` pattern.

```typescript
// Simplified conceptual structure of the context

declare const RefTypeTag: unique symbol;

type RefHandle<T> = Symbol & {
  readonly [RefTypeTag]: T
}

class PatternContext {
  private inheritedCaptures: ReadonlyMap<RefHandle<unknown>, unknown> | null = null;
  private captureBuffer: Map<RefHandle<unknown>, unknown> | null = null;

  // Called by bound `refPredicate` before userPredicate
  public constructor(state: MatchState<unknown>) { /* ... */ }

  // Called by bound `retrieveRef` and implicitly by `ref`
  public getRefValue<T>(variableId: RefHandle<T>): T {
    if (this.captureBuffer?.has(variableId)) { /* ... */ }
    if (this.inheritedCaptures?.has(variableId)) { /* ... */ }
    throw new ReferenceError(/* ... */);
  }

  // Called by bound `capture` (indirectly) when its inner predicate matches
  public setRefValue<T>(variableId: RefHandle<T>, value: T): void {
    if (!this.captureBuffer) throw new Error(/* ... */);
    this.captureBuffer.set(variableId, value);
  }

  // Called by bound `refPredicate` after userPredicate returns true
  public getRefs(): ReadonlyMap<RefHandle<unknown>, unknown> { /* ... */ }
}
``` 
