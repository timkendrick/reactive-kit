## Capture and Reference

The capture and reference system allows patterns to capture values during predicate matching and reference them in later parts of the pattern or even within the same predicate evaluation, enabling complex verification of related values within a test sequence.

### Reference Context and Bound Helpers

The `withRefs` helper function establishes a lexical scope for managing captures. It provides a set of bound helper functions that operate within this scope:

```typescript
import { withRefs, lazy, sequence, /* ... other imports */ } from "@reactive-kit/test-utils";

// withRefs takes a factory function receiving bound helpers
const pattern = withRefs((helpers) => {
  // Destructure the bound helpers for use within this scope
  const { createRef, refPredicate, captureRef, ref, retrieveRef } = helpers;

  // 1. Create capture variables using createRef
  const taskHandle = createRef<ActorHandle>();
  const resultValue = createRef<any>();

  // 2. Use the bound 'refPredicate' helper to bridge into pattern world
  return sequence([
    refPredicate(
      // 3. Use 'captureRef' inside other predicates to capture values
      // Here, capture the handle if it matches sentTo(any())
      and( // Example combining multiple predicates
        hasActionType(HandlerActionType.Spawn),
        // captureRef takes the ref and the inner predicate for the value
        sentTo(captureRef(taskHandle, any()))
      )
    ),
    refPredicate(
      and( // Example combining multiple predicates
        hasMessageType(MESSAGE_RESULT),
        // 4. Use the bound 'ref' predicate for direct equality match against captured value
        sentFrom(ref(taskHandle)), // ref(taskHandle) compares input handle === captured handle
        // Capture the message payload if other predicates match
        hasMessagePayload(captureRef(resultValue, any())),
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
*   `captureRef<V>(variable: RefAccessor<V>, innerPredicate: Predicate<V>): Predicate<V>`: A predicate that first evaluates `innerPredicate`. If true, it captures the input value into `variable` (within the current context) and returns true. Otherwise, returns false without capturing.
*   `retrieveRef<V>(variable: RefAccessor<V>): V`: Directly retrieves the currently captured value associated with `variable` from the context. Throws `ReferenceError` if the variable has not been captured on the current path. Useful within `lazy` or custom predicate functions.
*   `refPredicate(userPredicate: Predicate<T>): Pattern<T>`: Lifts a standard predicate function (`userPredicate`) into a pattern that consumes one item. It manages the context for `ref`, `captureRef`, and `retrieveRef` calls within `userPredicate`.

**General Predicate Combinators (available globally):**

*   `lazy<T>(factory: (value: T) => boolean): Predicate<T>`: A standard predicate combinator that defers the execution of the `factory` function until the predicate is evaluated. The `factory` receives the input value and computes the boolean result, often using `retrieveRef` to access captured values just-in-time.

### Value Capture (`captureRef`)

The bound `captureRef` helper is used *within* other predicates to capture the value being tested by that part of the predicate chain, if the inner predicate matches.

```typescript
import { withRefs, lazy, sequence, /* ... other imports */ } from "@reactive-kit/test-utils";

withRefs((helpers) => {
  const { createRef, refPredicate, captureRef } = helpers;
  const countRef = createRef<number>();
  const statusRef = createRef<string>();

  return sequence([
    // Capture the 'count' field if it equals 1
    refPredicate(
      hasField("count", captureRef(countRef, equals(1)))
    ),
    // Capture the 'status' field if it's any string
    refPredicate(
      hasField("status", captureRef(statusRef, any())) // Assuming any() is a predicate
    )
  ]);
})
```

### Back-References (`ref` and `retrieveRef`)

Use the bound `ref` predicate for direct equality comparisons. Use the bound `retrieveRef` helper within `lazy` or custom predicate functions for more complex comparisons or value access.

```typescript
import { withRefs, lazy, sequence, /* ... other imports */ } from "@reactive-kit/test-utils";

withRefs((helpers) => {
  const { createRef, refPredicate, captureRef, ref, retrieveRef } = helpers;
  const taskHandle = createRef<ActorHandle>();

  return sequence([
    // Capture the handle
    refPredicate(sentTo(captureRef(taskHandle, any()))),

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
import { withRefs, lazy, sequence, /* ... other imports */ } from "@reactive-kit/test-utils";

withRefs((helpers) => {
  const { createRef, refPredicate, captureRef, ref, retrieveRef } = helpers;

  const childHandle = createRef<ActorHandle>();
  const result = createRef<any>();

  return sequence([
    // Capture child handler's handle when it's spawned
    refPredicate(and(
      hasActionType(HandlerActionType.Spawn),
      hasSpawnHandlerType(ChildHandler),
      // Capture the target handle if the action matches
      sentTo(captureRef(childHandle, any()))
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
      hasMessagePayload(captureRef(result, any())) // Capture the payload
    ))
  ]);
})
```

### State Verification with Captures

Verify state transitions using captures and references.

```typescript
import { withRefs, lazy, sequence, /* ... other imports */ } from "@reactive-kit/test-utils";

withRefs((helpers) => {
  const { createRef, refPredicate, captureRef, ref, retrieveRef } = helpers;

  const state1Count = createRef<number>();

  return sequence([
    // Capture initial state's count field
    refPredicate(and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_INCREMENT),
      hasResultingState(
        // Use hasField to target the 'count', then capture if it equals 1
        hasField("count", captureRef(state1Count, equals(1)))
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

## Implementation Details

This section provides a detailed breakdown of each capture and reference function. These functions allow patterns to track values during matching and use them in subsequent parts of the pattern.

*   **`withRefs<T>(factory: (helpers: RefHelpers) => Pattern<T>): Pattern<T>`**
    *   **Description:** Creates a lexical scope for capture and reference operations. Provides bound helper functions that share a common reference context.
    *   **Returns:** A `Pattern<T>` that executes the pattern created by the factory function with its own isolated reference context.
    *   **Example:**
        *   Code:
            ```typescript
            // Create a pattern with reference capabilities
            const pattern = withRefs((helpers) => {
              // Destructure the bound helpers for use within this scope
              const { createRef, refPredicate, captureRef, ref } = helpers;
              
              // Create references and build patterns using the helpers
              const messageId = createRef<string>();
              
              return sequence([
                refPredicate(
                  hasField("id", captureRef(messageId, any()))
                ),
                refPredicate(
                  hasField("referenceId", ref(messageId))
                )
              ]);
            });
            ```

*   **`createRef<V>()`**
    *   **Description:** Creates a typed reference variable that can store captured values within the context of a `withRefs` block.
    *   **Returns:** A `RefAccessor<V>` object that serves as an identifier for accessing the captured value.
    *   **Example:**
        *   Code:
            ```typescript
            withRefs((helpers) => {
              const { createRef } = helpers;
              
              // Create typed reference variables
              const taskHandle = createRef<ActorHandle>();
              const count = createRef<number>();
              
              // Use these references elsewhere in the pattern...
            });
            ```

*   **`ref<V>(variable: RefAccessor<V>): Predicate<V>`**
    *   **Description:** Creates a predicate that tests whether an input value is strictly equal (`===`) to the value captured in the given reference variable.
    *   **Returns:** A `Predicate<V>` that returns `true` if the input matches the captured value, or `false` otherwise. Throws `ReferenceError` if the reference has not been captured yet.
    *   **Example:**
        *   Code:
            ```typescript
            withRefs((helpers) => {
              const { createRef, refPredicate, captureRef, ref, any } = helpers;
              const actorHandle = createRef<ActorHandle>();
              
              return sequence([
                // First capture an actor handle
                refPredicate(sentTo(captureRef(actorHandle, any()))),
                
                // Later verify a message is sent FROM that same actor
                refPredicate(sentFrom(ref(actorHandle)))
              ]);
            });
            ```

*   **`captureRef<V>(variable: RefAccessor<V>, innerPredicate: Predicate<V>): Predicate<V>`**
    *   **Description:** Creates a predicate that first tests the input with the inner predicate, and if it matches, captures the input value in the given reference variable.
    *   **Returns:** A `Predicate<V>` that returns the result of the inner predicate and stores the input value if the result is `true`.
    *   **Example:**
        *   Code:
            ```typescript
            withRefs((helpers) => {
              const { createRef, refPredicate, captureRef, equals, hasField } = helpers;
              const countValue = createRef<number>();
              
              return sequence([
                // Capture the count field if it equals 1
                refPredicate(
                  hasField("count", captureRef(countValue, equals(1)))
                ),
                
                // Later use the captured value in other predicates
                // ...
              ]);
            });
            ```

*   **`retrieveRef<V>(variable: RefAccessor<V>): V`**
    *   **Description:** Retrieves the current value stored in the given reference variable.
    *   **Returns:** The value of type `V` currently captured in the reference. Throws `ReferenceError` if the reference has not been captured yet.
    *   **Example:**
        *   Code:
            ```typescript
            withRefs((helpers) => {
              const { createRef, refPredicate, captureRef, retrieveRef, lazy, hasField, any } = helpers;
              const taskHandle = createRef<ActorHandle>();
              
              return sequence([
                // Capture a task handle
                refPredicate(
                  sentTo(captureRef(taskHandle, any()))
                ),
                
                // Use retrieveRef to access a property of the captured value
                refPredicate(
                  hasField(
                    'taskId',
                    lazy(taskIdValue => taskIdValue === retrieveRef(taskHandle).id)
                  )
                )
              ]);
            });
            ```

*   **`refPredicate<T>(userPredicate: Predicate<T>): Pattern<T>`**
    *   **Description:** Creates a pattern that applies a predicate within the capturing scope of `withRefs`. This enables the predicate to use `captureRef`, `ref`, and `retrieveRef` functions to interact with captured values in the current pattern match path.
    *   **Returns:** A `Pattern<T>` that attempts to match one item using the provided predicate. On match, it returns a new `MatchState` with `nextIndex` incremented and any captured references updated.
    *   **Example:**
        *   Code:
            ```typescript
            withRefs((helpers) => {
              const { createRef, refPredicate, captureRef, hasMessageType, hasField } = helpers;
              const status = createRef<string>();
              
              return sequence([
                // Use refPredicate to wrap standard predicates with reference context
                refPredicate(
                  and(
                    hasMessageType(MESSAGE_STATUS),
                    hasField("status", captureRef(status, any()))
                  )
                ),
                
                // Each refPredicate manages its own reference context
                refPredicate(
                  hasField("previousStatus", ref(status))
                )
              ]);
            });
            ``` 
