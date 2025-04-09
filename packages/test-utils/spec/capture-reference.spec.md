## Capture and Reference

The capture and reference system allows patterns to capture values during matching and reference them in later parts of the pattern, enabling complex verification of related values.

### Value Capture

The `capture` function allows storing matched values for later use:

```typescript
// Capture a value with a variable and a predicate
capture(taskHandle, sentTo(any()))

// Capture state field value
capture(finalState, hasField("count", equals(2)))
```

### Back-References

Captured values can be referenced in later parts of the pattern using the `ref` function:

```typescript
// Reference a previously captured value
sentFrom(ref(taskHandle))
```

### Reference Context

The `withRefs` function creates a lexical scope for declaring capture variables:

```typescript
withRefs((taskHandle, resultValue) => sequence([
  // Capture spawned task handle
  and(
    hasActionType(HandlerActionType.Spawn),
    capture(taskHandle, sentTo(any()))
  ),

  // Reference captured handle in later patterns
  and(
    hasMessageType(MESSAGE_RESULT),
    sentFrom(ref(taskHandle)),
    capture(resultValue, hasMessagePayload(any()))
  )
]))
```

### Complex Reference Patterns

References can be used to verify relationships between events in a sequence:

```typescript
withRefs((childHandle, result) => sequence([
  // Capture child handler's handle when it's spawned
  and(
    hasActionType(HandlerActionType.Spawn),
    hasSpawnHandlerType(ChildHandler),
    capture(childHandle, sentTo(any()))
  ),

  // Verify parent → child message
  and(
    hasActionType(HandlerActionType.Send),
    hasMessageType(MESSAGE_INITIALIZE),
    sentTo(ref(childHandle))
  ),

  // Verify child → parent message
  and(
    hasActionType(HandlerActionType.Send),
    hasMessageType(MESSAGE_READY),
    sentFrom(ref(childHandle)),
    capture(result, hasMessagePayload(any()))
  )
]))
```

### State Verification with Captures

Captures can be used to verify state transitions:

```typescript
withRefs((state1, state2) => sequence([
  // Capture initial state
  and(
    hasActionType(HandlerActionType.Send),
    hasMessageType(MESSAGE_INCREMENT),
    hasResultingState(
      capture(state1, hasField("count", equals(1)))
    )
  ),
  
  // Verify state changed correctly
  and(
    hasActionType(HandlerActionType.Send),
    hasMessageType(MESSAGE_INCREMENT),
    hasResultingState(
      capture(state2, and(
        hasField("count", n => n === ref(state1).count + 1),
        hasField("status", equals("updated"))
      ))
    )
  )
]))
```

### Implementation Details

Captures are stored in the match state and passed through the matching process:

```typescript
// Definition of MatchState with captures
export interface MatchState<T> {
  /** Input array to match against */
  input: Array<T>;
  /** Index of the next element in the input array to be matched */
  nextIndex: number;
  /** Captured sub-sequences from the input */
  captures: Array<unknown>;
}

// Example capture implementation
function capture<T, V>(variable: CaptureVariable<V>, pattern: Pattern<T>): Pattern<T> {
  return {
    match: (state) => {
      const results = pattern.match(state);
      return results.map(result => {
        // Store the captured value at the index associated with the variable
        const captureIndex = getCaptureIndex(variable);
        result.captures[captureIndex] = /* extracted value */;
        return result;
      });
    }
  };
}

// Example reference implementation
function ref<V>(variable: CaptureVariable<V>): V {
  // This is simplified; actual implementation would retrieve the value
  // from captures array at runtime
  const captureIndex = getCaptureIndex(variable);
  return /* value from captures at captureIndex */;
}
``` 
