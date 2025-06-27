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

The `predicate` pattern consumes exactly one item, matching on the given predicate:

```typescript
// Create a pattern that consumes one item matching the predicate
predicate(hasActionType(HandlerActionType.Send))

// Create a pattern that consumes a single item, regardless of its value
predicate(any())
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

## Implementation Details

This section provides a detailed breakdown of each pattern's behavior. Patterns operate on a `MatchState` which tracks the `input` array, the `nextIndex` to examine, and any `captures`. They return an array of possible resulting `MatchState`s.

*   **`predicate<T>(p: Predicate<T>)`**
    *   **Description:** Consumes exactly one item from the input. It matches if the predicate `p` returns `true` for the item at `nextIndex`.
    *   **Returns:** An array containing a single `MatchState` with `nextIndex` incremented if the predicate matches, otherwise an empty array.
    *   **Example Match:**
        *   Input:
            ```
            [5, 10]
            ```
        *   Pattern:
            ```typescript
            predicate(is(5))
            ```
        *   Result:
            - `nextIndex: 1, captures: []`
    *   **Example No Match:**
        *   Input:
            ```
            [5, 10]
            ```
        *   Pattern:
            ```typescript
            predicate(is(10))
            ```
        *   Result:
            - No matches

*   **`sequence<T>(patterns: Array<Pattern<T>>)`**
    *   **Description:** Matches a series of patterns sequentially. The output `MatchState`s from one pattern become the input for the next.
    *   **Returns:** An array of `MatchState`s representing all successful sequences of matches through all provided patterns. Returns an empty array if any pattern in the sequence fails to match.
    *   **Example Match:**
        *   Input:
            ```
            [5, 10, 15]
            ```
        *   Pattern:
            ```typescript
            sequence([predicate(is(5)), predicate(is(10))])
            ```
        *   Result:
            - `nextIndex: 2, captures: []`
    *   **Example No Match:**
        *   Input:
            ```
            [5, 10, 15]
            ```
        *   Pattern:
            ```typescript
            sequence([predicate(is(5)), predicate(is(15))])
            ```
        *   Result:
            - No matches

*   **`zeroOrMore<T>(pattern: Pattern<T>)`**
    *   **Description:** Greedily matches the provided `pattern` zero or more times. It always succeeds at least once (matching zero times). It attempts to match the pattern as many times as possible.
    *   **Returns:** An array of `MatchState`s. The first state always represents the "zero match" case (no change in `nextIndex`). Subsequent states represent matches after consuming 1, 2, ... N items according to the pattern.
    *   **Example:**
        *   Input:
            ```
            [5, 5, 10]
            ```
        *   Pattern:
            ```typescript
            zeroOrMore(predicate(is(5)))
            ```
        *   Result:
            - `nextIndex: 0, captures: []` - Zero matches
            - `nextIndex: 1, captures: []` - One match
            - `nextIndex: 2, captures: []` - Two matches

*   **`oneOrMore<T>(pattern: Pattern<T>)`**
    *   **Description:** Greedily matches the provided `pattern` one or more times. Fails if the pattern cannot be matched at least once.
    *   **Returns:** An array of `MatchState`s representing successful matches after consuming 1, 2, ... N items. Returns an empty array if the pattern doesn't match even once.
    *   **Example Match:**
        *   Input:
            ```
            [5, 5, 10]
            ```
        *   Pattern:
            ```typescript
            oneOrMore(predicate(is(5)))
            ```
        *   Result:
            - `nextIndex: 1, captures: []` - One match
            - `nextIndex: 2, captures: []` - Two matches
    *   **Example No Match:**
        *   Input:
            ```
            [10, 5, 5]
            ```
        *   Pattern:
            ```typescript
            oneOrMore(predicate(is(5)))
            ```
        *   Result:
            - No matches

*   **`repeat<T>(count: number, pattern: Pattern<T>)`**
    *   **Description:** Matches the provided `pattern` exactly `count` times sequentially.
    *   **Returns:** An array containing a single `MatchState` if the pattern matches exactly `count` times, otherwise an empty array.
    *   **Example Match:**
        *   Input:
            ```
            [5, 5, 5, 10]
            ```
        *   Pattern:
            ```typescript
            repeat(3, predicate(is(5)))
            ```
        *   Result:
            - `nextIndex: 3, captures: []`
    *   **Example No Match (Too few):**
        *   Input:
            ```
            [5, 5, 10]
            ```
        *   Pattern:
            ```typescript
            repeat(3, predicate(is(5)))
            ```
        *   Result:
            - No matches
    *   **Example No Match (Mismatch):**
        *   Input:
            ```
            [5, 5, 10, 5]
            ```
        *   Pattern:
            ```typescript
            repeat(3, predicate(is(5)))
            ```
        *   Result:
            - No matches

*   **`oneOf<T>(patterns: Array<Pattern<T>>)`**
    *   **Description:** Tries each provided pattern from the same starting `MatchState`.
    *   **Returns:** An array containing the concatenated results (all successful `MatchState`s) from all provided patterns.
    *   **Example:**
        *   Input:
            ```
            [5, 10]
            ```
        *   Pattern:
            ```typescript
            oneOf([
              predicate(is(5)),
              predicate(is(10)), // Fails at index 0
              predicate(is(5))
            ])
            ```
        *   Result:
            - `nextIndex: 1, captures: []` - From first `predicate(is(5))`
            - `nextIndex: 1, captures: []` - From third `predicate(is(5))`

*   **`parallel<T>(patterns: Array<Pattern<T>>)`**
    *   **Description:** Takes N patterns and attempts to match them consecutively, in any order. The resulting pattern is effectively a union of all permutations of the N patterns, where each permutation is expressed as a consecutive sequence of the N sub-patterns in a specific order.
    *   **Returns:** An array containing the set of all successful `MatchState`s encountered across all permutations. Returns an empty array if no matching permutation can be found.
    *   **Example Match (Simple Predicates):**
        *   Input:
            ```
            ['A', 'C', 'B', 'D']
            ```
        *   Pattern:
            ```typescript
            parallel([
              predicate(s => s === 'A'),
              predicate(s => s === 'B'),
              predicate(s => s === 'C')
            ])
            ```
        *   Result:
            - `nextIndex: 3, captures: []` (Consumes the prefix ['A', 'C', 'B'])
    *   **Example Match (Variable Consumption):**
        *   Input:
            ```
            ['A', 'B', 'B']
            ```
        *   Pattern:
            ```typescript
            parallel([
              predicate(s => s === 'A'),
              zeroOrMore(predicate(s => s === 'B'))
            ])
            ```
        *   Result:
            - `nextIndex: 1, captures: []` (Consumes prefix ['A'], zeroOrMore matches zero 'B's)
            - `nextIndex: 2, captures: []` (Consumes prefix ['A', 'B'], zeroOrMore matches one 'B')
            - `nextIndex: 3, captures: []` (Consumes prefix ['A', 'B', 'B'], zeroOrMore matches two 'B's)
    *   **Example No Match (Missing Item):**
        *   Input:
            ```
            ['A', 'C']
            ```
        *   Pattern:
            ```typescript
            parallel([
              predicate(s => s === 'A'),
              predicate(s => s === 'B'),
              predicate(s => s === 'C')
            ])
            ```
        *   Result:
            - No matches (Input block is too short)
    *   **Example No Match (Predicate Fail):**
        *   Input:
            ```
            ['A', 'X', 'B']
            ```
        *   Pattern:
            ```typescript
            parallel([
              predicate(s => s === 'A'),
              predicate(s => s === 'B'),
              predicate(s => s === 'C') // Fails to find a 'C' in the input block
            ])
            ```
        *   Result:
            - No matches
