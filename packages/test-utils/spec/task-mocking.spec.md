## Task Mocking System

The task mocking system provides a declarative API for mocking asynchronous operations in ReactiveKit actors, allowing precise control over timing and message sequences.

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
