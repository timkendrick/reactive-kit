## Predicates

Predicates are functions that match a single item in the input sequence. They return a boolean indicating whether the item matches.

### Core Predicate Types

```typescript
/** Basic predicate interface */
export interface Predicate<T> {
  (value: T): boolean;
}

/** Type narrowing predicate interface */
export interface TypeNarrowingPredicate<I, O extends I> extends Predicate<I> {
  (value: I): value is O;
}
```

### Basic Item Predicates

```typescript
// Match any item
any() // matches any single item

// Exact equality
equals(expected) // matches if item === expected
```

### Logical Combinators

Predicates can be composed using logical operators to create more complex predicates:

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

// Negate a predicate
not(
  and(
    hasActionType(HandlerActionType.Send),
    hasMessageType(MESSAGE_ERROR)
  )
)
```

### Structure Inspection

Predicates can inspect nested fields within complex objects:

```typescript
// Match specific fields in an object
hasField("status", equals("ready"))

// Match fields with predicate functions
hasField("count", n => n > 0)

// Combine field predicates
and(
  hasField("count", n => n > 0),
  hasField("items", arr => arr.length > 0)
)
```

### Handler-Specific Predicates

Specialized predicates for testing ReactiveKit actor handlers:

```typescript
// Match action type
hasActionType(HandlerActionType.Send)
hasActionType(HandlerActionType.Spawn)
hasActionType(HandlerActionType.Kill)

// Match message type (requires type narrowing from hasActionType first)
hasMessageType(MESSAGE_INCREMENT)

// Match message payload (requires type narrowing from hasActionType first)
hasMessagePayload({ value: 42 })

// Match message target/source
sentTo(handle)
sentFrom(handle)
```

### Type Narrowing

Predicates play an important role in type narrowing, especially for discriminated unions:

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
