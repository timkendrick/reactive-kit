## Pattern Matching System

The pattern matching system provides a composable approach to describing and verifying message sequences in actor-based systems.

### 1.1 Core Message Patterns

#### Basic Message Predicates
```typescript
// Match action type
hasActionType(HandlerActionType.Send)
hasActionType(HandlerActionType.Spawn)
hasActionType(HandlerActionType.Kill)

// Match message type
and(
  hasActionType(HandlerActionType.Send),
  hasMessageType(MESSAGE_INCREMENT)
)

// Match message payload
and(
  hasActionType(HandlerActionType.Send),
  hasMessageType(MESSAGE_INCREMENT),
  hasMessagePayload({ value: 42 })
)

// Match message target/source
sentTo(handle)
sentFrom(handle)
```

#### Type Narrowing
```typescript
// Base types (for demonstration purposes only, actual types may differ)
type HandlerAction = 
  | { type: HandlerActionType.Send; target: ActorHandle; message: Message }
  | { type: HandlerActionType.Spawn; target: ActorHandle; }
  | { type: HandlerActionType.Kill; target: ActorHandle };

// Type guard predicates narrow the action type
function hasActionType<T extends HandlerActionType>(
  type: T
): (action: HandlerAction) => action is Extract<HandlerAction, { type: T }> {
  return (action): action is Extract<HandlerAction, { type: T }> => 
    action.type === type;
}

// Message predicates can only be used after type narrowing
function hasMessageType<T extends MessageType>(
  type: T
): (action: Extract<HandlerAction, { type: HandlerActionType.Send }>) => boolean {
  return (action) => action.message.type === type;
}
```

### 1.2 Pattern Combinators

#### Logical Operators
```typescript
// Combine predicates with AND
and(
  hasActionType(HandlerActionType.Send),
  hasMessageType(MESSAGE_INCREMENT),
  hasMessagePayload({ value: 42 })
)

// Combine predicates with OR
or(
  and(
    hasActionType(HandlerActionType.Send),
    hasMessageType(MESSAGE_INCREMENT)
  ),
  and(
    hasActionType(HandlerActionType.Send),
    hasMessageType(MESSAGE_DECREMENT)
  )
)

// Negate predicates
not(
  and(
    hasActionType(HandlerActionType.Send),
    hasMessageType(MESSAGE_ERROR)
  )
)
```

#### Sequence Operators
```typescript
sequence([
  // Exact message
  exactMessage({ type: MESSAGE_START }),

  // Any number of messages
  zeroOrMore(any()),

  // One or more messages matching a predicate
  oneOrMore(
    and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_PROGRESS)
    )
  ),

  // Zero or more messages matching a predicate
  zeroOrMore(
    and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_UPDATE)
    )
  ),

  // Repeat a pattern exactly n times
  repeat(3,
    and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_TICK)
    )
  ),

  // Concurrent actions with unknown order
  parallel([
    and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_PROGRESS)
    ),
    and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_UPDATE)
    ),
  ]),

  // Sequences can be nested directly within another sequence
  sequence([
    and(
      hasActionType(HandlerActionType.Send),
      hasMessageType(MESSAGE_PROGRESS)
    ),
    exactMessage({ type: MESSAGE_END })
  ]),

  // Sequences can be nested within other combinators
  repeat(3,
    sequence([
      and(
        hasActionType(HandlerActionType.Send),
        hasMessageType(MESSAGE_PROGRESS)
      ),
      and(
        hasActionType(HandlerActionType.Send),
        hasMessageType(MESSAGE_UPDATE)
      )
    ])
  )
])
```

### 1.3 Value Capture and References

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

### 1.4 State Pattern Matching

#### Basic State Matching
```typescript
// Match specific fields
hasResultingState(
  hasField("status", equals("ready")),
)

// Match with predicates
hasResultingState(
  and(
    hasField("count", n => n > 0),
    hasField("items", arr => arr.length > 0)
  )
)
``` 
