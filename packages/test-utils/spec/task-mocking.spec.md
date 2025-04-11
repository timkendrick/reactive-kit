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
  emit({ type: "READY" })
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
  emit({ type: "STARTING" }),
  delay(100),
  emit({ type: "READY" }),
  waitFor(msg => msg.type === "BEGIN"),
  emit({ type: "WORKING" }),
  delay(200),
  emit({ type: "COMPLETE" })
]))
```

### 2.3 State Management

```typescript
mockAsyncTask(
  withState({ progress: 0 }, state => actions([
    // Update state
    modifyState(state, s => ({ progress: s.progress + 0.1 })),
    
    // Emit based on state
    getState(state, s => emit({ type: "PROGRESS", value: s.progress }))
  ]))
)

// State-based retry logic
mockAsyncTask(
  withState({ retries: 0 }, state => actions([
    modifyState(state, s => ({ retries: s.retries + 1 })),
    getState(state, s => actions([
      emit({ type: "ATTEMPT", count: s.retries })
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
      emit({ type: "READY" })
    ]),
    actions([
      emit({ type: "NOT_READY" })
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
          emit({ type: "RETRY" })
        ]),
        actions([
          emit({ type: "FAILED" })
        ])
      ),
      actions([
        emit({ type: "SUCCESS" })
      ])
    )
  ]))
)

// While loop for autonomous repeated actions
mockAsyncTask<MyInput, MyOutput>(
  withState({ count: 0 }, handle =>
    actions<MyInput, MyOutput>([
      whileLoop((loop) =>
        actions([
          getState(handle, s => {
            if (s.count >= 3) {
              return loop.break();
            } else {
              return actions([
                emit({ type: "TICK" }),
                modifyState(handle, cs => ({ count: cs.count + 1 })),
                delay(1000)
              ]);
            }
          }),
          when((msg): msg is CancelMsg => msg?.type === 'CANCEL',
             () => loop.break())
        ])
      ),
      emit({ type: 'LOOP_ENDED' })
    ])
  )
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

## Implementation Details

This section provides a detailed breakdown of each mock task action's behavior. Actions operate within the context of a `mockAsyncTask` definition and control how the mock task interacts with the system (e.g., yielding `HandlerAction`s) and how it responds to incoming messages or internal state changes.

*   **`emit<I, O>(message: O) -> MockAsyncTaskCommand<I, HandlerAction<O>>`**
    *   **Description:** Immediately yields the specified message from the mock task's iterator. The message is automatically wrapped in a `HandlerAction.Send(parent, message)` internally. This allows the mock task to send messages as part of its defined behavior. This action does *not* consume any input message sent to the task via `next()`.
    *   **Behavior:** The mock task's underlying async generator yields the provided message as a `HandlerAction.Send` action. The system running the mock task (e.g., the test environment) will process this action. Execution of the mock task's action sequence continues immediately after the `emit` action completes.
    *   **Example:**
        *   Sequence Step:
            ```typescript
            emit({ type: "DATA", value: 42 })
            ```
        *   Result: The mock task yields `[HandlerAction.Send(parent, { type: "DATA", value: 42 })]`. The test runner observes this yield. The mock task proceeds to the next action in its definition. 

*   **`waitFor<I, V extends I, O>(predicate: TypeNarrowingPredicate<I, V>, processor?: (message: V) => MockAsyncTaskCommand<I, O>)`**
*   **`waitFor<I, O>(predicate: Predicate<I>, processor?: (message: I) => MockAsyncTaskCommand<I, O>)`**
    *(Note: Two signatures using `TypeNarrowingPredicate` and `Predicate`, with added `<T>` for HandlerAction's message type)*
    *   **Description:** Pauses task execution until an incoming message `I` satisfies the `predicate`. If a `processor` function is provided, it is executed with the consumed message (type-narrowed if the predicate was a `TypeNarrowingPredicate`), and any returned `HandlerAction<T>` are yielded immediately. Messages received while waiting that do *not* satisfy the predicate are consumed and discarded.
    *   **Behavior:**
        1.  Task pauses, awaiting `next(message: I)`.
        2.  On message arrival, evaluate `predicate(message)`.
        3.  **If `false`:** Consume and discard the message. Continue waiting.
        4.  **If `true`:**
            *   Consume the message.
            *   If `processor` exists, call `processor(message)` (message type is narrowed to `N` if `predicate` was a `TypeNarrowingPredicate<I, N>`). Yield any returned `HandlerAction<T>`.
            *   Proceed to the next action in the sequence.
    *   **Type Safety:** Using a `TypeNarrowingPredicate` for the `predicate` ensures the `message` passed to the `processor` has the correct narrowed type `N`. The `<T>` parameter ensures that `HandlerAction.Send` within the processor is type-checked against the expected message union `T`.
    *   **Example (Type Guard & Processor):**
        ```typescript
        // Assuming T is the message union type (e.g., StartMsg | AckMsg | ...)
        waitFor<MyInputMsgs, StartMsg, MyOutputMsgs>(
          (msg): msg is StartMsg => msg.type === 'START',
          (startMsg) => {
            // startMsg is correctly typed as StartMsg
            // Can access startMsg.payload safely
            // Can create messages with types from MyOutputMsgs
            return emit({ type: 'ACK', id: startMsg.payload.id });
          }
        )
        ```
    *   **Example (Simple Predicate & Processor):**
        ```typescript
        // Assuming T is the message union type
        waitFor<MyInputMsgs, MyOutputMsgs>(
          msg => msg.value > 10,
          (msg) => {
            // msg has the original type MyInputMsgs
            // Can create messages with types from MyOutputMsgs
            return emit({ type: 'THRESHOLD_REACHED', value: msg.value });
          }
        )
        ```
    *   **Example (Wait Only):**
        ```typescript
        // No T needed if no processor returns HandlerActions
        waitFor<MyInputMsgs>(msg => msg.type === 'COMPLETE')
        // Pauses until 'COMPLETE' arrives, consumes it, then proceeds.
        // No processor needed.
        ```

*   **`delay<I, O>(durationMs: number) -> MocktaskCommand<I, O>`**
    *   **Description:** Pauses the execution of the mock task's action sequence for the specified duration in milliseconds. This action does not interact with incoming messages.
    *   **Behavior:** The mock task's execution is suspended. The underlying mechanism (e.g., `setTimeout` in the test environment) waits for `durationMs` milliseconds before resuming the execution with the next action in the sequence.
    *   **Example:**
        ```typescript
        actions([
          emit([HandlerAction.Send(parent, { type: 'START' })]),
          delay(100), // Wait 100ms
          emit([HandlerAction.Send(parent, { type: 'END' })])
        ])
        ```

*   **`complete<I, O>(value?: O) -> MockAsyncTaskCommand<I, O>`**
    *   **Description:** Terminates the mock task normally, optionally returning a final value. This signals the successful completion of the task's operation.
    *   **Behavior:** The mock task's underlying async generator function finishes its execution by executing a `return` statement. If a `value` is provided, it becomes the return value of the generator's iterator (`{ value: value, done: true }`). If no value is provided, it returns `{ value: undefined, done: true }`. No further actions in the sequence will be executed. The test runner observes this completion.
    *   **Example (With value):**
        ```typescript
        actions([
          // ... other actions ...
          complete({ result: 'Success' })
        ])
        ```
    *   **Example (Without value):**
        ```typescript
        actions([
          // ... other actions ...
          complete()
        ])
        ```

*   **`fail(error: Error)`**
    *   **Description:** Terminates the mock task abnormally by throwing an error. This signals that the task encountered an unrecoverable problem.
    *   **Behavior:** The mock task's underlying async generator function terminates by throwing the provided `error` object. The test runner observes this exception (e.g., via a rejected promise when calling the task's `next()` or `return()` methods, or by catching it if iterating the generator directly). No further actions in the sequence will be executed.
    *   **Example:**
        ```typescript
        actions([
          waitFor(msg => msg.type === 'PROCESS'),
          emit([HandlerAction.Send(parent, { type: 'PROCESSING' })]),
          // Simulate an error during processing
          fail(new Error("Processing failed due to invalid input"))
        ])
        ```

*   **`withState<S, I, O>(initialState: S, statefulCommandsFactory: (stateHandle: StateHandle<S>) => MockAsyncTaskCommand<I, O>)`**
    *   **Description:** Defines a stateful sequence for a mock task. It establishes an initial state (`initialState`) associated with a unique `stateHandle`. The `statefulCommandsFactory` function uses this handle to generate a sequence of `MockAsyncTaskCommand`s (including `modifyState` and `getState`) that operate within this state scope.
    *   **Behavior:**
        1.  **Configuration:** `mockAsyncTask` stores `initialState` and `statefulCommandsFactory`.
        2.  **Execution Start:** When the runner starts the `withState` block:
            *   It creates the state value internally: `let stateValue = initialState;`.
            *   It creates an opaque `stateHandle` associated with `stateValue`.
            *   It invokes `statefulCommandsFactory(stateHandle)` once to get the array of commands for this block. Commands like `modifyState(stateHandle, ...)` and `getState(stateHandle, ...)` generated here capture this specific handle.
        3.  **Command Execution:** The runner executes the generated commands sequentially. The handling of `modifyState` and `getState` within this sequence is detailed in their respective descriptions.
    *   **State Persistence:** The underlying state value associated with `stateHandle` persists and is mutable across the commands generated by *one call* to `statefulCommandsFactory`.
    *   **Scope:** State is localized. Each `withState` block manages its own independent state via its unique handle.
    *   **Type Parameters:** `S`, `I`, `T` as before. `MockAsyncTaskCommand` now potentially includes `S`.
    *   **Example (Structure):**
        ```typescript
        mockAsyncTask<MyInput, MyOutput>(
          withState({ counter: 0 }, stateHandle => actions<MyInput, MyOutput, MyState>([
            // modifyState is a command in the sequence
            modifyState(stateHandle, s => ({ counter: s.counter + 1 })),
            // getState is a command whose factory returns the next command(s)
            getState(stateHandle, s => {
              if (s.counter < 3) {
                return emit([HandlerAction.Send(parent, { type: 'COUNT', value: s.counter })]);
              } else {
                return complete(); // Example: complete the task based on state
              }
            }),
            // Other commands can follow...
            delay(100)
          ]))
        );
        ```

*   **`modifyState<S, I, O>(stateHandle: StateHandle<S>, modifierFn: (currentState: S) => S) -> MockAsyncTaskCommand<I, O>`**
    *   **Type Name:** Defined as a `MockAsyncTaskCommand`. Requires the `stateHandle` provided by the enclosing `withState` factory.
    *   **Description:** A command within a `withState` sequence that synchronously updates the state associated with the provided `stateHandle`.
    *   **Behavior:** When the runner executes this command:
        1.  It retrieves the current state value linked to the captured `stateHandle`.
        2.  It calls `modifierFn` with the current state value.
        3.  It updates the state value linked to `stateHandle` with the *new state value* returned by `modifierFn`.
        4.  Execution proceeds immediately to the next command in the sequence.
    *   **Return Value:** The `modifierFn` must return the new state value (of type `S`).
    *   **Example (within `withState` -> `actions`):**
        ```typescript
        withState({ count: 0 }, handle =>
          actions<MyInput, MyOutput>([ // Assuming 'actions' returns a single composite command
            // ... other commands ...
            modifyState(handle, s => ({ count: s.count + 1 })),
            // ... subsequent commands ...
          ])
        )
        ```

*   **`getState<S, I, O>(stateHandle: StateHandle<S>, commandFactoryFn: (currentState: S) => MockAsyncTaskCommand<I, O>) -> MockAsyncTaskCommand<I, O>`**
    *   **Type Name:** Defined as a `MockAsyncTaskCommand`. Requires the `stateHandle`.
    *   **Description:** A command within a `withState` sequence that reads the current state and uses it to determine the *next* command to execute.
    *   **Behavior:** When the runner executes this command:
        1.  It retrieves the current state value linked to the captured `stateHandle`.
        2.  It calls `commandFactoryFn` with this current state value.
        3.  The `commandFactoryFn` must return the next single `MockAsyncTaskCommand` (e.g., `emit(...)`, `delay(...)`, `complete()`, `waitFor(...)`, etc.) based on the state. Let's call this the `innerCommand`.
        4.  The runner effectively replaces the `getState` command in its execution plan with this `innerCommand` and proceeds to execute the `innerCommand`.
        5.  Execution continues with the command originally *after* the `getState` only if and when the `innerCommand` fully completes its execution without terminating the task.
    *   **Return Value:** The `commandFactoryFn` must return a single `MockAsyncTaskCommand<I, O>`.
    *   **Example (within `withState` -> `actions`):**
        ```typescript
        withState({ status: 'idle' }, handle =>
          actions<MyInput, MyOutput>([
            // ... other commands potentially modifying state ...
            getState(handle, s => {
              if (s.status === 'ready') {
                // If ready, emit a READY signal (completes immediately)
                return emit({ type: 'READY' });
              } else {
                // Otherwise, wait for a 'START' message (blocks)
                return waitFor((msg): msg is StartMsg => msg.type === 'START');
              }
            }),
            // Subsequent Command Example:
            emit({ type: 'TRANSITION_COMPLETE' })
            // Note: This 'TRANSITION_COMPLETE' emit will execute only *after* the command
            // returned by the getState factory completes.
            // - If status was 'ready', 'emit(READY)' runs, completes, then 'emit(TRANSITION_COMPLETE)' runs.
            // - If status was 'idle', 'waitFor(START)' runs and blocks. 'emit(TRANSITION_COMPLETE)'
            //   will only run if/when the 'waitFor' receives the 'START' message and finishes.
            // - If the factory returned complete() or fail(), this subsequent command would never run.
          ])
        )
        ```

*   **`when<I, V extends I, O>(predicate: TypeNarrowingPredicate<I, V>, commandIfTrue: (message: V) => MockAsyncTaskCommand<I, O>, commandIfFalse?: (message: I) => MockAsyncTaskCommand<I, O>) -> MockAsyncTaskCommand<I, O>`**
*   **`when<I, O>(predicate: Predicate<I>, commandIfTrue: (message: I) => MockAsyncTaskCommand<I, O>, commandIfFalse?: (message: I) => MockAsyncTaskCommand<I, O>) -> MockAsyncTaskCommand<I, O>`**
    *   **Type Name:** Defined as a `MockAsyncTaskCommand`. Supports `Predicate` and `TypeNarrowingPredicate`.
    *   **Description:** A command that waits for the next incoming message, consumes it, and then conditionally executes one of two specified command branches based on whether the message satisfies the `predicate`.
    *   **Behavior:**
        1.  The runner encounters the `when` command and pauses, awaiting the next incoming message via `next(message)`.
        2.  When a message arrives, the `when` command consumes it.
        3.  The `predicate(message)` is evaluated.
        4.  **If `true`:**
            *   The `commandIfTrue` factory function is called with the (potentially type-narrowed) message.
            *   The `MockAsyncTaskCommand` returned by `commandIfTrue` replaces the `when` command in the execution plan.
            *   The runner executes this returned command next.
        5.  **If `false`:**
            *   If `commandIfFalse` factory function is provided, it's called with the original message. The `MockAsyncTaskCommand` it returns replaces the `when` command and is executed next.
            *   If `commandIfFalse` is *not* provided, the `when` command completes immediately, and the runner proceeds to the next command in the sequence after the `when`.
        6.  Similar to `getState`, execution proceeds to the command originally *after* the `when` only if and when the chosen branch's command (`commandIfTrue` or `commandIfFalse`) fully completes without terminating the task.
    *   **Type Safety:** Using a `TypeNarrowingPredicate` ensures the `message` passed to the `commandIfTrue` factory has the correct narrowed type `V`.
    *   **Example:**
        ```typescript
        actions<MyInput, MyOutput>([
          // ... other commands ...
          when(
            // Predicate (Type Guard)
            (msg): msg is StartMsg => msg.type === 'START',
            // Command if True (receives narrowed 'startMsg')
            (startMsg) => emit({ type: 'STARTED', id: startMsg.payload.id }),
            // Command if False (receives original 'msg')
            (msg) => emit({ type: 'UNEXPECTED_MSG', receivedType: msg.type })
          ),
          // This command executes after either the 'STARTED' or 'UNEXPECTED_MSG' emit completes.
          delay(100)
        ])
        ```

*   **`whileLoop<I, O>(loopBodyFactory: (commands: { break: () => MockAsyncTaskCommand<I, O>, continue: () => MockAsyncTaskCommand<I, O> }) => MockAsyncTaskCommand<I, O>) -> MockAsyncTaskCommand<I, O>`**
    *   **Type Name:** Defined as a `MockAsyncTaskCommand`.
    *   **Description:** Creates a command that repeatedly executes a body command sequence. The loop\'s control flow (termination or continuing to the next iteration) is managed explicitly by executing special `break` or `continue` commands returned by the `loopBodyFactory`.
    *   **Behavior:**
        1.  The runner encounters the `whileLoop` command.
        2.  It enters the loop execution context.
        3.  **Loop Iteration Start:** It calls `loopBodyFactory`, providing an object containing two functions:
            *   `break()`: Returns a special `MockAsyncTaskCommand` instance signaling immediate loop termination.
            *   `continue()`: Returns a special `MockAsyncTaskCommand` instance signaling immediate termination of the *current iteration* and starting the next one.
        4.  The factory returns the `MockAsyncTaskCommand` for the loop body (e.g., `actions([...])`).
        5.  The runner begins executing the commands within the loop body sequence.
        6.  **During Body Execution:**
            *   If the runner executes the special `break` command: The loop terminates immediately. Execution proceeds to the command following the `whileLoop`.
            *   If the runner executes the special `continue` command: The rest of the current iteration\'s body commands are skipped. Execution jumps back to step 3 (Loop Iteration Start) to begin the next iteration.
            *   If a command within the body terminates the task (e.g., `complete`, `fail`), the loop and the task end.
            *   If the entire loop body sequence completes normally (without hitting `break`, `continue`, or terminating), execution implicitly jumps back to step 3 to begin the next iteration.
    *   **Requires:** Typically used within `withState` if the loop condition or body depends on state, allowing `getState` inside the loop body to call `break()` or `continue()` conditionally.
    *   **Example:**
        ```typescript
        withState({ count: 0 }, handle =>
          actions<MyInput, MyOutput>([
            whileLoop((loop) =>
              actions([
                getState(handle, s => {
                  if (s.count >= 3) {
                    return loop.break();
                  } else {
                    return actions([
                      emit({ type: "TICK" }),
                      modifyState(handle, cs => ({ count: cs.count + 1 })),
                      delay(1000)
                    ]);
                  }
                }),
                when((msg): msg is CancelMsg => msg?.type === 'CANCEL',
                   () => loop.break())
              ])
            ),
            emit({ type: 'LOOP_ENDED' })
          ])
        )
        ```

*   **`{ createIterator(handle: ActorHandle<O>): AsyncGenerator<Array<HandlerAction<O>>, void, I> }`**
    *   **Type Name:** Raw object implementing the `MockAsyncTaskDefinition<I, O>` interface (conceptual name).
    *   **Description:** Provides maximum flexibility by allowing the definition of a custom asynchronous generator function (`createIterator`) to directly control the mock task\'s behavior. This bypasses the declarative command structure entirely.
    *   **Behavior:**
        1.  When the mock task is started, the `mockAsyncTask` runner calls the provided `createIterator` function, passing it the `handle` of the mock actor itself.
        2.  The runner then iterates over the returned async generator.
        3.  **Yielding Actions:** When the generator `yield`s an array of `HandlerAction<O>`, the runner processes those actions (sending messages, spawning actors, etc.). The generator\'s execution pauses until the yield completes.
        4.  **Receiving Messages:** The generator can pause its execution and wait for an incoming message `I` by calling `await this.next()`. (Note: Within the generator, `this` refers to an implicit context providing `next`, `return`, `throw` methods corresponding to the `MockAsyncTask` interface). The `next()` method resolves with the next message delivered to the task.
        5.  **Termination:**
            *   Normal completion occurs when the generator function executes a `return` statement (or reaches its end). The runner observes `{ done: true }`.
            *   Abnormal termination occurs if the generator function `throw`s an error. The runner observes the thrown error.
    *   **Context (`this`):** Inside `createIterator`, `this` provides access to:
        *   `this.next(): Promise<I>`: Waits for and returns the next incoming message.
        *   `this.return?(value?: O): Promise<IteratorResult<Array<HandlerAction<O>>, void>>`: Signals normal completion with an optional value (rarely used with `yield`).
        *   `this.throw?(error: Error): Promise<IteratorResult<Array<HandlerAction<O>>, void>>`: Signals abnormal completion by throwing an error.
    *   **Example:**
        ```typescript
        mockAsyncTask<MyInput, MyOutput>({
          async *createIterator(handle) {
            // Send an initial ready message
            yield [HandlerAction.Send(handle, { type: \'READY\' })];

            let receivedStop = false;
            while (!receivedStop) {
              // Wait for the next message
              const msg = await this.next();

              if (msg.type === \'ECHO_REQUEST\') {
                // Echo the payload back
                yield [HandlerAction.Send(handle, { type: \'ECHO_RESPONSE\', payload: msg.payload })];
              } else if (msg.type === \'STOP\') {
                // Signal stop and exit loop
                yield [HandlerAction.Send(handle, { type: \'STOPPING\' })];
                receivedStop = true;
              }
              // Ignore other message types
            }
            // Generator finishes, task completes normally
          }
        })
        ```
