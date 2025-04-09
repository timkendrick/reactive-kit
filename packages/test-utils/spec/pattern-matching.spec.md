## Pattern Matching System

The pattern matching system provides a composable, type-safe approach to describing and verifying message sequences in actor-based testing. It allows for complex patterns with alternative paths, repetitions, and back-references.

### Architecture

The system is built around three core components:

1. **Predicates**: Functions that match a single item in the input sequence.
2. **Patterns**: Composable matchers that consume sequences of items and track match state.
3. **Capture & Reference**: System for capturing values and referencing them later in patterns.

#### Component Relationships

```
┌───────────────────────────────────────────────────────┐
│                      Test Pattern                     │
└───────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────┐
│                   Pattern Matchers                    │
│                                                       │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│   │  sequence   │  │ zeroOrMore  │  │   repeat    │   │
│   └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                       │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│   │  parallel   │  │  oneOrMore  │  │    oneOf    │   │
│   └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                       │
│                    ┌─────────────┐                    │
│                    │  predicate  │                    │
│                    └──────┬──────┘                    │
└───────────────────────────│───────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────┐
│                      Predicates                       │
│                                                       │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│   │     and     │  │     or      │  │     not     │   │
│   └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                       │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│   │hasActionType│  │hasMessageType│ │   hasField  │   │
│   └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Key Concepts

- **Predicates vs. Patterns**: Predicates match a single item, while patterns match sequences of items. The `predicate()` helper converts a predicate into a pattern.
- **Match State**: Patterns maintain state as they process the input, enabling backtracking and capturing values.
- **Backtracking**: Complex patterns can produce multiple possible match paths, enabling pattern matching with variable-length repetitions.

### Detailed Specifications

For detailed documentation on each component:

- [Predicates](./predicates.spec.md) - Type-safe predicates for matching individual items
- [Patterns](./patterns.spec.md) - Composable patterns for matching sequences 
- [Capture and Reference](./capture-reference.spec.md) - Capturing values and back-references in patterns

### Usage Example

Here's a simplified example showing how the components work together:

```typescript
// Define a pattern using all three components
withRefs((taskHandle, result) => sequence([
  // Pattern: match a single input item
  // Predicate: match an action type
  // Capture: store the task handle
  predicate(and(
    hasActionType(HandlerActionType.Spawn),
    capture(taskHandle, sentTo(any()))
  )),

  // Pattern: oneOrMore repetition
  // Predicate: match message type
  // Reference: use the captured handle
  oneOrMore(
    predicate(and(
      hasActionType(HandlerActionType.Send),
      sentFrom(ref(taskHandle)),
      hasMessageType("PROGRESS")
    ))
  ),

  // More predicates and a capture
  predicate(and(
    hasActionType(HandlerActionType.Send),
    sentFrom(ref(taskHandle)),
    hasMessageType("COMPLETE"),
    capture(result, hasMessagePayload(any()))
  ))
]))
``` 
