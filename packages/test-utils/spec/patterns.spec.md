## Patterns

Patterns are composable matchers that consume sequences of items from the input, maintaining match state as they process items. Unlike predicates that match a single item, patterns can match variable-length sequences and track multiple possible match paths.

### Core Pattern Interface

```typescript
/**
 * Pattern matcher that can consume elements from an input array
 * and return information about possible matches.
 */
export interface Pattern<T> {
  /**
   * Attempt to match a pattern starting at the given position
   * @param state The current match state
   * @returns All possible match results
   */
  match(state: MatchState<T>): Array<MatchState<T>>;
}

/**
 * Represents a single possible match result from a pattern matcher
 */
export interface MatchState<T> {
  /** Input array to match against */
  input: Array<T>;
  /** Index of the next element in the input array to be matched */
  nextIndex: number;
  /** Captured sub-sequences from the input */
  captures: Array<unknown>;
}
```

### Predicate Pattern

The `predicate` pattern bridges between predicates and patterns by lifting a predicate into a pattern that consumes exactly one item:

```typescript
// Create a pattern that consumes one item matching the predicate
predicate(hasActionType(HandlerActionType.Send))

// Internally implemented as:
function predicate<T>(pred: Predicate<T>): Pattern<T> {
  return {
    match: (state) => {
      if (state.nextIndex >= state.input.length) return [];
      const item = state.input[state.nextIndex];
      const result = pred(item);
      if (!result) return [];
      return [
        {
          ...state,
          nextIndex: state.nextIndex + 1,
        },
      ];
    },
  };
}
```

### Exact Value Pattern

Match an exact value in the sequence:

```typescript
// Match an exact message
exactMessage({ type: MESSAGE_START })
```

### Sequence Pattern

Matches a sequence of patterns one after another, passing match state between them:

```typescript
sequence([
  predicate(hasActionType(HandlerActionType.Send)),
  predicate(hasActionType(HandlerActionType.Spawn)),
  predicate(hasActionType(HandlerActionType.Kill))
])

// Sequences can be nested
sequence([
  predicate(hasMessageType(MESSAGE_START)),
  sequence([
    predicate(hasMessageType(MESSAGE_PROGRESS)),
    predicate(hasMessageType(MESSAGE_END))
  ])
])
```

### Repetition Patterns

Patterns for matching repeated sequences:

```typescript
// Match zero or more
zeroOrMore(
  predicate(
    and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_UPDATE)
    )
  )
)

// Match one or more
oneOrMore(
  predicate(
    and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_PROGRESS)
    )
  )
)

// Match exactly n repetitions
repeat(3,
  predicate(
    and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_TICK)
    )
  )
)
```

### Alternative Paths Pattern

The `oneOf` pattern tries multiple alternatives and returns all possible match paths:

```typescript
oneOf([
  predicate(hasMessageType(MESSAGE_INCREMENT)),
  predicate(hasMessageType(MESSAGE_DECREMENT)),
  sequence([
    predicate(hasMessageType(MESSAGE_RESET)),
    predicate(hasMessageType(MESSAGE_START))
  ])
])
```

### Parallel Pattern

Matches patterns in any order:

```typescript
parallel([
  predicate(
    and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_PROGRESS)
    )
  ),
  predicate(
    and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_UPDATE)
    )
  )
])
```

### Match State and Backtracking

Complex patterns can produce multiple possible match states, representing different ways the input can match the pattern. When a pattern is part of a larger sequence, each match state is passed to the next pattern in the sequence:

```typescript
// This pattern can match the input in multiple ways
sequence([
  // First consume some progress messages
  zeroOrMore(predicate(hasMessageType(MESSAGE_PROGRESS))),
  
  // Then an update message
  predicate(hasMessageType(MESSAGE_UPDATE)),
  
  // Then maybe more progress messages
  zeroOrMore(predicate(hasMessageType(MESSAGE_PROGRESS))),
  
  // And finally an end message
  predicate(hasMessageType(MESSAGE_END))
])
```

For a sequence like: `[PROGRESS, PROGRESS, UPDATE, PROGRESS, END]`, the pattern can match with the first `zeroOrMore` consuming:
- No messages
- One `PROGRESS` message
- Two `PROGRESS` messages

The matcher will try all possibilities and return all successful match paths. 
