# @reactive-kit/test-utils

A powerful testing framework for ReactiveKit applications, providing tools for both unit testing and integration testing of actor-based message handling, async tasks, and state management.

## Installation

```bash
pnpm add @reactive-kit/test-utils
```

## Features

- 🎯 **Pattern Matching System** - Composable system for verifying message sequences
- 🔄 **Async Task Mocking** - Declarative API for mocking asynchronous operations
- ✅ **State Verification** - Tools for validating handler state transitions
- 🐛 **Debug Helpers** - Trace and inspect message flows and state changes

## Quick Start

```typescript
import { verifyHandlerBehavior, mockAsyncTask, actions } from '@reactive-kit/test-utils';

test("counter handler", async () => {
  const handler = new CounterHandler();

  await verifyHandlerBehavior(handler, {
    verify: sequence([
      predicate(hasResultingState(
        and(
          hasField("count", equals(0)),
          hasField("status", equals("ready"))
        )
      )),

      sequence([
        predicate(and(
          hasActionType(HandlerActionType.Send),
          hasMessageType(MESSAGE_INCREMENT),
          hasResultingState(hasField("count", equals(1)))
        )),
        predicate(and(
          hasActionType(HandlerActionType.Send),
          hasMessageType(MESSAGE_INCREMENT),
          hasResultingState(hasField("count", equals(2)))
        ))
      ])
    ])
  });
});
```

## Core Concepts

### 1. Pattern Matching

The framework provides a rich set of composable predicates for matching message sequences:

```typescript
// Basic predicates
hasActionType(HandlerActionType.Send)
hasMessageType(MESSAGE_INCREMENT)
hasMessagePayload({ value: 42 })

// Logical combinations
and(
  hasActionType(HandlerActionType.Send),
  hasMessageType(MESSAGE_INCREMENT)
)

// Sequence matching
sequence([
  predicate(hasMessageType(MESSAGE_START)),
  zeroOrMore(predicate(any())),
  oneOrMore(predicate(hasMessageType(MESSAGE_PROGRESS)))
])

// Support for unpredictable message order
parallel([
  predicate(and(
    hasActionType(HandlerActionType.Send),
    hasMessageType(MESSAGE_INCREMENT)
  )),
  predicate(and(
    hasActionType(HandlerActionType.Send),
    hasMessageType(MESSAGE_DECREMENT)
  ))
])
```

…and many more.

### 2. Async Task Mocking

Mock complex asynchronous operations with a declarative API:

```typescript
mockAsyncTask(actions([
  // Wait for specific message
  waitFor(msg => msg.type === "START"),
  
  // Delay execution
  delay(100),
  
  // Emit messages
  emit([
    HandlerAction.Send(parent, { type: "PROGRESS", value: 0.5 })
  ]),
  
  // Complete or fail
  complete()
]))
```

### 3. State Verification

Validate handler state transitions:

```typescript
hasResultingState(
  and(
    hasField("status", equals("ready")),
    hasField("count", n => n > 0)
  )
)
```

## Advanced Usage

### Testing Multi-Handler Interactions

```typescript
test("parent-child interaction", async () => {
  await verifyHandlerBehavior(parentHandler, {
    verify: withRefs((helpers) => {
      const { createRef, refPredicate, captureRef, ref, any } = helpers;

      const childHandle = createRef<ActorHandle>();

      return sequence([
        refPredicate(
          and(
            hasActionType(HandlerActionType.Spawn),
            hasSpawnHandlerType(ChildHandler),
            sentTo(captureRef(childHandle, any()))
          )
        ),
        refPredicate(
          and(
            hasActionType(HandlerActionType.Send),
            sentTo(ref(childHandle))
          )
        ),
        refPredicate(
          and(
            hasActionType(HandlerActionType.Send),
            sentFrom(ref(childHandle))
          )
        )
      ]);
    })
  });
});
```

### Debugging Tests

```typescript
const trace = createMessageTrace();

await verifyHandlerBehavior(handler, {
  middleware: trace,
  verify: /* pattern */
});

// Inspect trace after test
console.log(trace.getMessageSequence());
console.log(trace.getStateTransitions());
console.log(trace.getAsyncTaskEvents());
```

### Testing with Timeouts

```typescript
await verifyHandlerBehavior(handler, {
  timeout: 1000,
  verify: /* pattern */
});
```

## API Reference

### Core Functions

- `verifyHandlerBehavior(handler, options)` - Main testing function
- `mockAsyncTask(config)` - Create mock async tasks
- `createMessageTrace()` - Create debug trace collector

### Pattern Matchers

- Logical Operators
  - `and(...predicates)`
  - `or(...predicates)`
  - `not(predicate)`

- Sequence Operators
  - `sequence(patterns)`
  - `parallel(patterns)`
  - `repeat(count, pattern)`
  - `zeroOrMore(pattern)`
  - `oneOrMore(pattern)`

- Object matchers
  - `hasField(key, predicate)`

- Message Matchers
  - `hasActionType(type)`
  - `hasMessageType(type)`
  - `hasMessagePayload(payload)`
  - `sentTo(handle)`
  - `sentFrom(handle)`
  - `hasResultingState(predicate)`

### Task Mocking

- Actions
  - `emit(actions)`
  - `waitFor(predicate)`
  - `delay(ms)`
  - `complete()`
  - `fail(error)`

- State Management
  - `withState(initial, actions)`
  - `modifyState(state, fn)`
  - `getState(state, fn)`
