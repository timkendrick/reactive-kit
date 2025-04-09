## Test Patterns

Complete examples demonstrating how to use the testing framework for various scenarios.

### 1. Basic Handler Testing

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

### 2. Async Task Testing

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

### 3. Error Handling

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

### 4. Periodic Task Testing

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
