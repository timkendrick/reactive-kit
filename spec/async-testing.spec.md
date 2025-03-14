# Async Testing Framework

## Overview

The Async Testing Framework provides a flexible, type-safe system for testing ReactiveKit's actor-based message handling. It focuses on two primary testing scenarios:

1. Unit Testing: Verifying individual handler behavior by:
   - Asserting correct state transitions in response to messages
   - Confirming expected message emissions
   - Validating spawned task behavior

2. Integration Testing: Verifying interactions between multiple actors by:
   - Testing message flow through actor hierarchies
   - Validating complex message sequences
   - Testing end-to-end scenarios with multiple handlers

The framework is built around three core capabilities:

1. Pattern Matching: A composable system for describing and verifying message sequences, supporting both exact matches and flexible patterns with back-references.

2. Async Task Mocking: A declarative API for mocking asynchronous operations, allowing precise control over timing and message sequences.

3. State Verification: Tools for validating handler state transitions while maintaining encapsulation of internal implementation details.

## 1. Pattern Matching System

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

#### State Transitions
```typescript
// Verify state change from previous
hasStateTransition(
  (prev, next) => 
    and(
      hasField("count", n => n == prev + 1),
      hasField("status", equals("active"))
    )
)

// Verify sequence of states
sequence([
  hasResultingState(hasField("status", equals("init"))),
  hasResultingState(hasField("status", equals("loading"))),
  hasResultingState(hasField("status", equals("ready")))
])
```

## 2. Task Mocking System

### 2.1 Core Task Interface

```typescript
interface MockAsyncTask<I, O> extends AsyncActor<I, O> {
  next(message?: I): Promise<AsyncTaskResult<O>>;
  return?(value?: O): Promise<AsyncTaskResult<O>>;
  throw?(error: Error): Promise<AsyncTaskResult<O>>;
}
```

### 2.2 Basic Actions

```typescript
// Basic emit action
mockAsyncTask(actions([
  emit([
    HandlerAction.Send(parent, { type: "READY" })
  ])
]))

// Wait for specific message
mockAsyncTask(actions([
  waitFor(msg => msg.type === "START")
]))

// Delay execution
mockAsyncTask(actions([
  delay(100) // ms
]))

// Complete task
mockAsyncTask(actions([
  complete()
]))

// Fail with error
mockAsyncTask(actions([
  fail(new Error("Task failed"))
]))

// Combined basic actions
mockAsyncTask(actions([
  emit([HandlerAction.Send(parent, { type: "STARTING" })]),
  delay(100),
  emit([HandlerAction.Send(parent, { type: "READY" })]),
  waitFor(msg => msg.type === "BEGIN"),
  emit([HandlerAction.Send(parent, { type: "WORKING" })]),
  delay(200),
  emit([HandlerAction.Send(parent, { type: "COMPLETE" })])
]))
```

### 2.3 State Management

```typescript
mockAsyncTask(
  withState({ progress: 0 }, state => actions([
    // Update state
    modifyState(state, s => ({ progress: s.progress + 0.1 })),
    
    // Emit based on state
    getState(state, s => emit([
      HandlerAction.Send(parent, { 
        type: "PROGRESS", 
        value: s.progress 
      })
    ]))
  ]))
)

// State-based retry logic
mockAsyncTask(
  withState({ retries: 0 }, state => actions([
    modifyState(state, s => ({ retries: s.retries + 1 })),
    getState(state, s => actions([
      emit([
        HandlerAction.Send(parent, {
          type: "ATTEMPT",
          count: s.retries
        })
      ])
      delay(Math.pow(2, s.retries) * 100)
    ])),
  ]))
)
```

### 2.4 Control Flow

```typescript
// Conditional execution in response to incoming message
mockAsyncTask(actions([
  when(
    msg => msg.type === "START" && msg.payload.ready,
    actions([
      emit([HandlerAction.Send(parent, { type: "READY" })])
    ]),
    actions([
      emit([HandlerAction.Send(parent, { type: "NOT_READY" })])
    ])
  )
]))

// State-based conditions in response to incoming message
mockAsyncTask(
  withState({ retries: 0 }, state => actions([
    when(
      msg => msg.type === "FAIL",
      when(
        msg => state.retries < 3,
        actions([
          modifyState(state, s => ({ retries: s.retries + 1 })),
          emit([HandlerAction.Send(parent, { type: "RETRY" })])
        ]),
        actions([
          emit([HandlerAction.Send(parent, { type: "FAILED" })])
        ])
      ),
      actions([
        emit([HandlerAction.Send(parent, { type: "SUCCESS" })])
      ])
    )
  ]))
)

// While loop for autonomous repeated actions
mockAsyncTask(
  withState({ count: 0 }, state => actions([
    whileLoop(
      msg => state.count < 3 && msg.type !== "CANCEL",
      actions([
        emit([HandlerAction.Send(parent, { type: "TICK" })]),
        modifyState(state, s => ({ count: s.count + 1 })),
        delay(1000)
      ])
    )
  ]))
)
```

### 2.5 Custom Implementation

```typescript
mockAsyncTask({
  async *createIterator(handle) {
    // Custom implementation with full control
    while (true) {
      const msg = await this.next();
      if (msg.type === "STOP") break;
      yield [HandlerAction.Send(handle, { type: "ECHO", msg })];
    }
  }
})
```

## 3. Test Helpers

### 3.1 Handler Testing Setup

```typescript
// Basic handler test
await verifyHandlerBehavior(handler, {
  verify: /* pattern */,
  asyncTasks: /* task mocks */
});

// With initial state
await verifyHandlerBehavior(handler, {
  initialMessage: { type: MESSAGE_INIT },
  verify: /* pattern */
});

// With timeout
await verifyHandlerBehavior(handler, {
  timeout: 1000,
  verify: /* pattern */
});

// With async tasks
await verifyHandlerBehavior(handler, {
  asyncTasks: {
    [TASK_TYPE]: () => mockAsyncTask(actions([
      emit([HandlerAction.Send(parent, { type: "READY" })])
    ]))
  },
  verify: /* pattern */
});
```

### 3.2 Multi-Handler Testing
```typescript
test("parent-child interaction", async () => {
  await verifyHandlerBehavior(parentHandler, {
    verify: withRefs((childHandle, result) => sequence([
      // Verify child handler spawn
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
  });
});

test("handler chain", async () => {
  await verifyHandlerBehavior(controller, {
    verify: withRefs((handleA, handleB, handleC) => sequence([
      // Capture all handler references
      parallel([
        and(
          hasActionType(HandlerActionType.Spawn),
          hasSpawnHandlerType(HandlerA),
          capture(handleA, sentTo(any()))
        ),
        and(
          hasActionType(HandlerActionType.Spawn),
          hasSpawnHandlerType(HandlerB),
          capture(handleB, sentTo(any()))
        ),
        and(
          hasActionType(HandlerActionType.Spawn),
          hasSpawnHandlerType(HandlerC),
          capture(handleC, sentTo(any()))
        ),
      ]),

      // Verify message flow A → B → C
      sequence([
        and(
          hasActionType(HandlerActionType.Send),
          sentFrom(ref(handleA)),
          sentTo(ref(handleB))
        ),
        and(
          hasActionType(HandlerActionType.Send),
          sentFrom(ref(handleB)),
          sentTo(ref(handleC))
        )
      ])
    ]))
  });

});
```

### 3.3 Debug Helpers

```typescript
interface MessageTrace {
  getMessageSequence(): HandlerAction[];
  getStateTransitions(): StateTransition[];
  getAsyncTaskEvents(): TaskEvent[];
}

// Enable debug tracing
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

## Examples

1. Basic Handler Testing
```typescript
test("counter handler", async () => {
  const handler = new CounterHandler();

  await verifyHandlerBehavior(handler, {
    verify: withRefs((finalState) => sequence([
      // Initial state
      hasResultingState(
        and(
          hasField("count", equals(0)),
          hasField("status", equals("ready"))
        )
      ),

      // Increment messages
      sequence([
        and(
          hasActionType(HandlerActionType.Send),
          hasMessageType(MESSAGE_INCREMENT),
          hasResultingState(hasField("count", equals(1)))
        ),
        and(
          hasActionType(HandlerActionType.Send),
          hasMessageType(MESSAGE_INCREMENT),
          hasResultingState(hasField("count", equals(2)))
        ),
        and(
          hasActionType(HandlerActionType.Send),
          hasMessageType(MESSAGE_GET_COUNT),
          hasResultingState(
            capture(finalState, hasField("count", equals(2)))
          )
        )
      ])
    ]))
  });
});
```

2. Async Task Testing
```typescript
test("file upload handler", async () => {
  const handler = new FileUploadHandler();

  await verifyHandlerBehavior(handler, {
    asyncTasks: {
      [UPLOAD_TASK]: () => mockAsyncTask(
        actions([
          // Wait for upload start
          waitFor(msg => msg.type === "START_UPLOAD"),
          
          // Simulate upload progress
          ...Array.from({ length: 3 }, (_, i) => 
            actions([
              delay(100),
              emit([
                HandlerAction.Send(parent, {
                  type: "PROGRESS",
                  progress: (i + 1) * 0.33
                })
              ])
            ])
          ),

          // Complete upload
          emit([
            HandlerAction.Send(parent, {
              type: "COMPLETE",
              url: "https://example.com/file"
            })
          ])
        ])
      )
    },

    verify: withRefs((uploadTask, url) => sequence([
      // Verify task spawn
      and(
        hasActionType(HandlerActionType.Spawn),
        hasSpawnHandlerType(UploadTask),
        hasSpawnPayload(hasField("file", { name: "test.txt", size: 1024 })),
        capture(uploadTask, sentTo(any()))
      ),

      // Verify upload progress
      sequence([
        and(
          hasActionType(HandlerActionType.Send),
          sentFrom(ref(uploadTask)),
          hasMessageType("PROGRESS"),
          hasMessagePayload({ progress: 0.33 }),
          hasResultingState(hasField("progress", equals(0.33)))
        ),
        and(
          hasActionType(HandlerActionType.Send),
          sentFrom(ref(uploadTask)),
          hasMessageType("PROGRESS"),
          hasMessagePayload({ progress: 0.66 }),
          hasResultingState(hasField("progress", equals(0.66)))
        ),
        and(
          hasActionType(HandlerActionType.Send),
          sentFrom(ref(uploadTask)),
          hasMessageType("PROGRESS"),
          hasMessagePayload({ progress: 0.99 }),
          hasResultingState(hasField("progress", equals(0.99)))
        )
      ]),

      // Verify completion
      and(
        hasActionType(HandlerActionType.Send),
        sentFrom(ref(uploadTask)),
        hasMessageType("COMPLETE"),
        capture(url, hasMessagePayload(hasField("url", any()))),
        hasResultingState(
          and(
            hasField("status", equals("complete")),
            hasField("progress", equals(1.0))
          )
        )
      )
    ]))
  });
});
```

3. Error Handling
```typescript
test("retry with backoff", async () => {
  const handler = new RetryingHandler();

  await verifyHandlerBehavior(handler, {
    asyncTasks: {
      [RETRY_TASK]: () => mockAsyncTask(
        withState({ attempts: 0 }, state =>
          actions([
            // Fail twice, succeed on third try
            when(
              msg => state.attempts < 2,
              actions([
                modifyState(state, s => ({ attempts: s.attempts + 1 })),
                getState(state, s => delay(Math.pow(2, s.attempts) * 100)),
                fail(new Error("Task failed"))
              ]),
              emit([
                HandlerAction.Send(parent, {
                  type: "SUCCESS",
                  result: "finally worked"
                })
              ])
            )
          ])
        )
      )
    },

    verify: withRefs((taskHandle) => sequence([
      // Verify task spawn
      and(
        hasActionType(HandlerActionType.Spawn),
        capture(taskHandle, sentTo(any()))
      ),

      // First attempt fails
      sequence([
        and(
          hasActionType(HandlerActionType.Send),
          sentFrom(ref(taskHandle)),
          hasMessageType("ERROR"),
          hasResultingState(
            and(
              hasField("attempts", equals(1)),
              hasField("status", equals("retrying"))
            )
          )
        ),
        ensureDelay(100)
      ]),

      // Second attempt fails
      sequence([
        and(
          hasActionType(HandlerActionType.Send),
          sentFrom(ref(taskHandle)),
          hasMessageType("ERROR"),
          hasResultingState(
            and(
              hasField("attempts", equals(2)),
              hasField("status", equals("retrying"))
            )
          )
        ),
        ensureDelay(200)
      ]),

      // Third attempt succeeds
      and(
        hasActionType(HandlerActionType.Send),
        sentFrom(ref(taskHandle)),
        hasMessageType("SUCCESS"),
        hasResultingState(
          and(
            hasField("attempts", equals(3)),
            hasField("status", equals("complete"))
          )
        )
      )
    ]))
  });
});
```

4. Periodic Task Testing
```typescript
test("periodic task handler", async () => {
  const handler = new PeriodicTaskHandler();
  
  await verifyHandlerBehavior(handler, {
    asyncTasks: {
      [PERIODIC_TASK]: () => mockAsyncTask(
        actions([
          // Initial setup
          emit([
            HandlerAction.Send(parent, { type: "READY" })
          ]),
          
          // Emit 3 periodic updates
          ...Array.from({ length: 3 }, () => 
            actions([
              delay(1000),
              emit([
                HandlerAction.Send(parent, { 
                  type: "UPDATE",
                  timestamp: Date.now() 
                })
              ])
            ])
          ),
          
          // Complete
          emit([
            HandlerAction.Send(parent, { type: "COMPLETE" })
          ])
        ])
      )
    },

    verify: withRefs((taskHandle) => sequence([
      // Verify task spawn and ready message
      sequence([
        and(
          hasActionType(HandlerActionType.Spawn),
          capture(taskHandle, sentTo(any()))
        ),
        and(
          hasActionType(HandlerActionType.Send),
          sentFrom(ref(taskHandle)),
          hasMessageType("READY")
        )
      ]),

      // Verify exactly 3 periodic updates
      repeat(3,
        and(
          hasActionType(HandlerActionType.Send),
          sentFrom(ref(taskHandle)),
          hasMessageType("UPDATE"),
          hasMessagePayload(hasField("timestamp", any()))
        )
      ),

      // Verify completion
      and(
        hasActionType(HandlerActionType.Send),
        sentFrom(ref(taskHandle)),
        hasMessageType("COMPLETE")
      )
    ]))
  });
});
```

### Related Specs

1. [Actor System](./actor-system.spec.md)
   - Testing framework builds on core actor system concepts:
     - Message passing patterns
     - Handler lifecycle management
     - Async task spawning
     - State management

2. [Dependency Tracking](./dependency-tracking.spec.md)
   - Testing framework must respect dependency tracking:
     - Message causality chains
     - Effect subscriptions
     - State dependencies
     - Cross-realm coordination

3. [Runtime Scheduler](./runtime-scheduler.spec.md)
   - Testing framework integrates with scheduler:
     - Message ordering guarantees
     - Actor spawning/killing
     - Task coordination

4. [Plugin Architecture](./plugin-architecture.spec.md)
   - Testing framework supports plugin testing:
     - Effect handler testing
     - Hook testing
     - Plugin message flow
     - Plugin state management
