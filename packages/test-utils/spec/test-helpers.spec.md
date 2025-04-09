## Test Helpers

The test helpers provide utilities for setting up and validating tests for ReactiveKit actors, with support for both unit testing and integration testing scenarios.

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
