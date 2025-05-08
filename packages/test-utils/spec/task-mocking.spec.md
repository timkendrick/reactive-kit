## Task Mocking System

The task mocking system provides a declarative API for mocking asynchronous operations in ReactiveKit actors, allowing precise control over timing and message sequences.

### 2.1 Basic Actions

```typescript
// Basic send action
act((self, { outbox }) => send(outbox, { type: "READY" }))

// Complete task
act((self, { complete }) => complete())

// Fail with error
act((self, { fail }) => fail(new Error("Task failed")))

// Wait for specific message
act((self, { outbox }) => actions(() => [
  waitFor(msg => msg.type === "START"),
  send(outbox, { type: "READY" })
]))

// Delay execution
act((self, { outbox }) => actions(() => [
  delay(100), // ms
  send(outbox, { type: "READY" })
]))

// Combined basic actions
act((self, { outbox }) => actions(() => [
  send(outbox, { type: "STARTING" }),
  delay(100),
  send(outbox, { type: "READY" }),
  waitFor(msg => msg.type === "BEGIN"),
  send(outbox, { type: "WORKING" }),
  delay(200),
  send(outbox, { type: "COMPLETE" })
]))
```

### 2.2 State Management

```typescript
act((self, { outbox }) => 
  withState(() => ({ progress: 0 }), state => actions(() => [
    // Update state
    modifyState(state, s => ({ progress: s.progress + 0.1 })),
    
    // Emit based on state
    getState(state, s => send(outbox, { type: "PROGRESS", value: s.progress }))
  ]))
)

// State-based retry logic
act((self, { outbox }) => 
  withState(() => ({ retries: 0 }), state => actions(() => [
    modifyState(state, s => ({ retries: s.retries + 1 })),
    getState(state, s => actions(() => [
      send(outbox, { type: "ATTEMPT", count: s.retries })
      delay(Math.pow(2, s.retries) * 100)
    ])),
  ]))
)
```

### 2.3 Control Flow

```typescript
// Conditional execution in response to incoming message
act((self, { outbox }) => when(
  msg => msg.type === "START" && msg.payload.ready,
  send(outbox, { type: "READY" }),
  send(outbox, { type: "NOT_READY" })
))

// State-based conditions in response to incoming message
act((self, { outbox }) => 
  withState(() => ({ retries: 0 }), state => when(
    msg => msg.type === "FAIL",
    getState(state, s => {
      if (s.retries >= 3) {
        return send(outbox, { type: "FAILED" });
      } else {
        return actions(() => [
          modifyState(state, s => ({ retries: s.retries + 1 })),
          send(outbox, { type: "RETRY" })
        ])
      }
    }),
    send(outbox, { type: "SUCCESS" })
  ))
)

// While loop for autonomous repeated actions
act<MyMessage>((self, { outbox }) => (
  withState(() => ({ count: 0 }), handle =>
    actions<MyMessage>(() => [
      whileLoop((loop) =>
        actions(() => [
          getState(handle, s => {
            if (s.count >= 3) {
              return loop.break();
            } else {
              return actions(() => [
                send(outbox, { type: "TICK" }),
                modifyState(handle, cs => ({ count: cs.count + 1 })),
                delay(1000)
              ]);
            }
          }),
          when((msg): msg is CancelMsg => msg?.type === 'CANCEL',
             () => loop.break())
        ])
      ),
      send(outbox, { type: 'LOOP_ENDED' })
    ])
  )
))
```

### 2.4 Custom Implementation

```typescript
createIterator<MyMessage>(async function* () {
  // Custom implementation with full control
  while (true) {
    const msg = await this.next();
    if (msg.type === "STOP") {
      yield [HandlerAction.Kill(this.inbox)];
      break;
    }
    yield [HandlerAction.Send(this.outbox, { type: "ECHO", msg })];
  }
})
```

## Implementation Details

Mock tasks are defined using the `act` factory function. This function provides a context and helper utilities to construct the task's behavior declaratively.

*   **`act<T>(definition: (self: ActorHandle<T>, helpers: { outbox: ActorHandle<T>, complete: () => MockAsyncTaskCommand<T>, fail: (error: Error) => MockAsyncTaskCommand<unknown, never> }) => MockAsyncTaskCommand<T>) -> MockAsyncTaskDefinition<T>`**
    *   **Description:** The main factory function for creating a declarative mock task definition. It accepts a `definition` function callback that outlines the task's lifecycle, interactions, and responses to incoming messages. The `definition` function must return a single `MockAsyncTaskCommand` (commonly `actions(...)` or `withState(...)`) which serves as the root of the task's behavior tree.
    *   **Type Parameters:**
        *   `T`: The union type of messages that the mock task can receive and (typically) send.
    *   **Parameters:**
        *   `definition`: `(self: ActorHandle<T>, helpers: { outbox: ActorHandle<T>, complete: () => MockAsyncTaskCommand<T>, fail: (error: Error) => MockAsyncTaskCommand<unknown, never> }) => MockAsyncTaskCommand<T>`
            A callback function invoked to build the task's behavior. It receives two arguments:
            *   `self: ActorHandle<T>`: An `ActorHandle` representing the mock task itself. This handle can be used by actions like `kill(self)` to allow the task to terminate itself or to be used as a target for messages if the task needs to send messages to itself (though less common in typical mocking scenarios).
            *   `helpers`: An object containing essential helper utilities and context for defining the task. It includes:
                *   `outbox: ActorHandle<T>`: An `ActorHandle` for the actor designated to receive messages sent *from* this mock task. Actions like `send(outbox, message)` use this handle to direct output. Typically, this is the parent actor, the test harness, or the system under test that interacts with the mock.
                *   **`complete(): MockAsyncTaskCommand<T>`**
                    *   **Description:** A helper function that returns a command to terminate the mock task normally, signaling successful completion of its operation.
                    *   **Behavior:** When this command is executed, the mock task's underlying async generator function effectively finishes its execution as if by a `return` statement. No further actions in the current sequence or task will be executed. The test runner or task supervisor observes this normal completion.
                    *   **Example (within `act`):**
                        ```typescript
                        act<MyMessage>((self, { complete }) => actions(() => [
                          // ... other actions
                          complete() // Signal normal completion
                        ]))
                        ```
                *   **`fail(error: Error): MockAsyncTaskCommand<unknown, never>`**
                    *   **Description:** A helper function that returns a command to terminate the mock task abnormally by throwing an error, signaling that the task encountered an unrecoverable problem or a deliberate failure condition.
                    *   **Behavior:** When this command is executed, the mock task's underlying async generator function terminates by throwing the provided `error` object. The test runner or task supervisor observes this exception (e.g., via a rejected promise if awaiting the task's completion, or by catching it if iterating the generator directly). No further actions in the current sequence or task will be executed.
                    *   **Example (within `act`):**
                        ```typescript
                        act<MyMessage>((self, { outbox, fail }) => actions(() => [
                          waitFor(msg => msg.type === 'PROCESS'),
                          send(outbox, { type: 'PROCESSING' }),
                          // Simulate an error during processing
                          fail(new Error("Processing failed due to invalid input"))
                        ]))
                        ```
    *   **Return Value:** `MockAsyncTaskDefinition<T>`: An opaque definition object. This object is then used by the test runner (e.g., via a testing utility like `TestBed.runAsyncActor`) to instantiate and execute the mock task according to the defined behavior.
    *   **Example (Overall Structure):**
        ```typescript
        interface MyMessage { type: "PING" | "PONG" | "INIT_DATA"; payload?: any; }

        const myMockTaskDefinition = act<MyMessage>((self, { outbox, complete, fail }) =>
          withState(() => ({ initialized: false }), stateHandle =>
            actions(() => [
              waitFor((msg): msg is Extract<MyMessage, { type: "INIT_DATA" }> => msg.type === "INIT_DATA",
                (initMsg) => actions(() => [
                  send(outbox, { type: "PONG", payload: initMsg.payload }),
                  modifyState(stateHandle, () => ({ initialized: true }))
                ])
              ),
              getState(stateHandle, s => {
                if (!s.initialized) {
                  return fail(new Error("Task was not initialized before other interactions."));
                }
                // Example: send another PONG if initialized, or different logic
                return send(outbox, { type: "PONG" });
              }),
              // Potentially more actions or conditional completion
              complete()
            ])
          )
        );
        ```

This section provides a detailed breakdown of each mock task action's behavior. 

*   **`send<T>(target: ActorHandle<T>, message: T) -> MockAsyncTaskCommand<T, HandlerAction<T>>`**
    *   **Description:** Immediately yields the specified message from the mock task's iterator. The message is automatically wrapped in a `HandlerAction.Send(parent, message)` internally. This allows the mock task to send messages as part of its defined behavior. This action does *not* consume any input message sent to the task via `next()`.
    *   **Behavior:** The mock task's underlying async generator yields the provided message as a `HandlerAction.Send` action. The system running the mock task (e.g., the test environment) will process this action. Execution of the mock task's action sequence continues immediately after the `send` action completes.
    *   **Example:**
        *   Sequence Step:
            ```typescript
            send(outbox, { type: "DATA", value: 42 })
            ```
        *   Result: The mock task yields `[HandlerAction.Send(outbox, { type: "DATA", value: 42 })]`. The test runner observes this yield. The mock task proceeds to the next action in its definition. 

*   **`kill<T>(target: ActorHandle<T>) -> MockAsyncTaskCommand<unknown, never>`**
    *   **Description:** Immediately yields a `HandlerAction.Kill` for the specified `target` actor handle. If the target actor is the mock task itself, no further actions will be processed. This action does *not* consume any input message sent to the task via `next()`.
    *   **Behavior:** The mock task's underlying async generator yields `[HandlerAction.Kill(target)]`.
    *   **Example:**
        ```typescript
        actions(() => [
          send(outbox, { type: 'INITIALIZING' }),
          delay(50),
          // Simulate abrupt termination
          kill(self), 
          // This send command will NOT be executed
          send(outbox, { type: 'THIS_WONT_RUN' }) 
        ])
        ```

*   **`waitFor<T, V extends T>(predicate: TypeNarrowingPredicate<T, V>, processor?: (message: V) => MockAsyncTaskCommand<T>)`**
*   **`waitFor<T>(predicate: Predicate<T>, processor?: (message: T) => MockAsyncTaskCommand<T>)`**
    *(Note: Two signatures using `TypeNarrowingPredicate` and `Predicate`, with added `<T>` for HandlerAction's message type)*
    *   **Description:** Pauses task execution until an incoming message `T` satisfies the `predicate`. If a `processor` function is provided, it is executed with the consumed message (type-narrowed if the predicate was a `TypeNarrowingPredicate`), and any returned `HandlerAction<T>` are yielded immediately. Messages received while waiting that do *not* satisfy the predicate are consumed and discarded.
    *   **Behavior:**
        1.  Task pauses, awaiting `next(message: T)`.
        2.  On message arrival, evaluate `predicate(message)`.
        3.  **If `false`:** Consume and discard the message. Continue waiting.
        4.  **If `true`:**
            *   Consume the message.
            *   If `processor` exists, call `processor(message)` (message type is narrowed to `V` if `predicate` was a `TypeNarrowingPredicate<T, V>`). Yield any returned `HandlerAction<T>`.
            *   Proceed to the next action in the sequence.
    *   **Type Safety:** Using a `TypeNarrowingPredicate` for the `predicate` ensures the `message` passed to the `processor` has the correct narrowed type `V`. The `<T>` parameter ensures that `HandlerAction.Send` within the processor is type-checked against the expected message union `T`.
    *   **Example (Type Guard & Processor):**
        ```typescript
        // Assuming T is the message union type (e.g., StartMsg | AckMsg | ...)
        waitFor<MyMessage, StartMsg>(
          (msg): msg is StartMsg => msg.type === 'START',
          (startMsg) => {
            // startMsg is correctly typed as StartMsg
            // Can access startMsg.payload safely
            // Can create messages with types from MyOutputMsgs
            return send(outbox, { type: 'ACK', id: startMsg.payload.id });
          }
        )
        ```
    *   **Example (Simple Predicate & Processor):**
        ```typescript
        waitFor<MyMessage>(
          msg => msg.value > 10,
          (msg) => {
            // msg has the original type MyMessage
            // Can create messages with types from MyOutputMsgs
            return send(outbox, { type: 'THRESHOLD_REACHED', value: msg.value });
          }
        )
        ```
    *   **Example (Wait Only):**
        ```typescript
        waitFor<MyMessage>(msg => msg.type === 'COMPLETE')
        // Pauses until 'COMPLETE' arrives, consumes it, then proceeds.
        // No processor needed.
        ```

*   **`delay<T>(durationMs: number) -> MockAsyncTaskCommand<T>`**
    *   **Description:** Pauses the execution of the mock task's action sequence for the specified duration in milliseconds. This action does not interact with incoming messages.
    *   **Behavior:** The mock task's execution is suspended. The underlying mechanism (e.g., `setTimeout` in the test environment) waits for `durationMs` milliseconds before resuming the execution with the next action in the sequence.
    *   **Example:**
        ```typescript
        actions(() => [
          send(outbox, { type: 'START' }),
          delay(100), // Wait 100ms
          send(outbox, { type: 'END' })
        ])
        ```

*   **`none<T>() -> MockAsyncTaskCommand<T>`**
    *   **Description:** A no-operation command. It has no effect on the task's state, does not yield any output, and does not consume any input. Execution proceeds immediately to the next command in the sequence.
    *   **Behavior:** The runner effectively skips this command.
    *   **Example:**
        ```typescript
        when(
          msg => msg.type === 'IGNORE_THIS',
          // Do nothing if the message type is 'IGNORE_THIS'
          () => none(),
          // Otherwise, send an acknowledgement
          (msg) => send(outbox, { type: 'ACK', id: msg.id })
        )
        ```

*   **`actions<T>(commands: (controls: { done: () => MockAsyncTaskCommand<T> }) => Array<MockAsyncTaskCommand<T>>)`**
    *   **Type Name:** Defined as a `MockAsyncTaskCommand`. Serves as a container for executing a sequence of other commands.
    *   **Description:** Executes a sequence of `MockAsyncTaskCommand`s one after another. The provided `commands` is 
        a factory function that receives a `controls` object. This function must return an array of commands. The `controls` object contains:
            *   `done()`: A function that returns a pre-bound lexically-scoped command, scoped to the `actions` block. When executed, this command immediately terminates the execution of the `actions` block whose factory function provided the `done` function (the 'lexical scope root'), regardless of how deeply nested within child blocks the `done` command occurs (similar to a `break` statement). Any subsequent commands within that current block's sequence (even if nested within other commands like `waitFor` or inner `actions`) will be skipped, as will any subsequent commands within parent blocks that are also nested within the lexical scope root, with control flow resuming at the command following the lexical scope root `actions` block.
    *   **Behavior:** The runner executes the commands returned by the factory in order. If a `done()` command is encountered within the commands, the execution of the `actions` sequence **associated with the factory that produced that `done` command** stops immediately. The runner then proceeds to whatever command was defined *after* that specific `actions` block (if any).
    *   **Example (Array Input):**
        ```typescript
        actions(() => [
          send(outbox, { type: 'START' }),
          delay(100),
          send(outbox, { type: 'FINISH' })
        ])
        ```
    *   **Example (Factory Input with `done`):**
        ```typescript
        actions<MyMessage>(({ done }) => [
          send(outbox, { type: 'STEP_1' }),
          when((msg): msg is StopMsg => msg.type === 'STOP',
            // If we receive a 'STOP' message, terminate this sequence
            (stopMsg) => done(),
            // Otherwise perform a different action
            (otherMsg) => send(outbox, { type: 'STEP_2_AFTER_WAIT' })
          ),
          // This send is only executed if 'STOP' was *not* received
          send(outbox, { type: 'STEP_3' })
        ])
        ```

*   **`withState<S, T>(initialState: () => S, factory: (stateHandle: StateHandle<S>) => MockAsyncTaskCommand<T>)`**
    *   **Description:** Defines a stateful command for a mock task. It establishes an initial state (based on the `initialState` factory) associated with a unique `stateHandle`. The `factory` function uses this handle to generate a `MockAsyncTaskCommand` that operates within this state scope (allowing `modifyState` and `getState` commands to access the state).
    *   **Behavior:**
        1.  **Configuration:** Stores `initialState` and `factory`.
        2.  **Execution Start:** When execution encounters the `withState` block:
            *   It creates the state value internally: `let stateValue = initialState();`.
            *   It creates an opaque `stateHandle` that can be used to retrieve or modify `stateValue`.
            *   It invokes `factory(stateHandle)` once to get the body of the stateful block. Commands like `modifyState(stateHandle, ...)` and `getState(stateHandle, ...)` generated here capture this specific handle.
        3.  **Command Execution:** The runner executes the body command. The handling of `modifyState` and `getState` within this sequence is detailed in their respective descriptions.
    *   **State Persistence:** The underlying state value associated with `stateHandle` persists and is mutable within the commands generated by the factory. If the command is re-encountered (due to loops etc), the initial state will be recreated.
    *   **Scope:** State is localized. Each `withState` block manages its own independent state via its unique handle.
    *   **Example (Structure):**
        ```typescript
        act<MyMessage>((self, { outbox, complete }) => (
          withState(() => ({ counter: 0 }), stateHandle => actions<MyMessage>([
            // modifyState is a command in the sequence
            modifyState(stateHandle, s => ({ counter: s.counter + 1 })),
            // getState is a command whose factory returns the next command(s)
            getState(stateHandle, s => {
              if (s.counter < 3) {
                return send(outbox, { type: 'COUNT', value: s.counter });
              } else {
                return complete(); // Example: complete the task based on state
              }
            }),
            // Other commands can follow...
            delay(100)
          ]))
        ));
        ```

*   **`modifyState<S, T>(stateHandle: StateHandle<S>, updater: (currentState: S) => S) -> MockAsyncTaskCommand<T>`**
    *   **Type Name:** Defined as a `MockAsyncTaskCommand`. Requires the `stateHandle` provided by the enclosing `withState` factory.
    *   **Description:** A command within a `withState` sequence that synchronously updates the state associated with the provided `stateHandle`.
    *   **Behavior:** When the runner executes this command:
        1.  It retrieves the current state value linked to the captured `stateHandle`.
        2.  It calls `updater` with the current state value.
        3.  It updates the state value linked to `stateHandle` with the *new state value* returned by `updater`.
        4.  Execution proceeds immediately to the next command in the sequence.
    *   **Return Value:** The `updater` must return the new state value (of type `S`).
    *   **Example (within `withState` -> `actions`):**
        ```typescript
        withState(() => ({ count: 0 }), state =>
          actions<MyMessage>([ // Assuming 'actions' returns a single composite command
            // ... other commands ...
            modifyState(state, s => ({ count: s.count + 1 })),
            // ... subsequent commands ...
          ])
        )
        ```

*   **`getState<S, T>(stateHandle: StateHandle<S>, factory: (currentState: S) => MockAsyncTaskCommand<T>) -> MockAsyncTaskCommand<T>`**
    *   **Type Name:** Defined as a `MockAsyncTaskCommand`. Requires the `stateHandle`.
    *   **Description:** A command within a `withState` sequence that reads the current state and uses it to lazily determine the *next* command to execute.
    *   **Behavior:** When the runner executes this command:
        1.  It retrieves the current state value linked to the captured `stateHandle`.
        2.  It calls `factory` with this current state value.
        3.  The `factory` must return the next single `MockAsyncTaskCommand` (e.g., `send(outbox, ...)`, `delay(...)`, `waitFor(...)`, etc.) based on the state. Let's call this the `innerCommand`.
        4.  The runner effectively replaces the `getState` command in its execution plan with this `innerCommand` and proceeds to execute the `innerCommand`.
        5.  Execution continues with the command originally *after* the `getState` only if and when the `innerCommand` fully completes its execution without terminating the task.
    *   **Return Value:** The `factory` must return a single `MockAsyncTaskCommand<T>`.
    *   **Example (within `withState` -> `actions`):**
        ```typescript
        withState(() => ({ status: 'idle' }), handle =>
          actions<MyMessage>([
            // ... other commands potentially modifying state ...
            getState(handle, s => {
              if (s.status === 'ready') {
                // If ready, emit a READY signal (completes immediately)
                return send(outbox, { type: 'READY' });
              } else {
                // Otherwise, wait for a 'START' message (blocks)
                return waitFor((msg): msg is StartMsg => msg.type === 'START');
              }
            }),
            // Subsequent Command Example:
            send(outbox, { type: 'TRANSITION_COMPLETE' })
            // Note: This 'TRANSITION_COMPLETE' send will execute only *after* the command
            // returned by the getState factory completes.
            // - If status was 'ready', 'send(outbox, READY)' runs, completes, then 'send(outbox, TRANSITION_COMPLETE)' runs.
            // - If status was 'idle', 'waitFor(START)' runs and blocks. 'send(outbox, TRANSITION_COMPLETE)'
            //   will only run if/when the 'waitFor' receives the 'START' message and finishes.
            // - If the factory returned complete() or fail(), this subsequent command would never run.
          ])
        )
        ```

*   **`when<T, V extends T>(predicate: TypeNarrowingPredicate<T, V>, commandIfTrue: (message: V) => MockAsyncTaskCommand<T>, commandIfFalse?: (message: T) => MockAsyncTaskCommand<T>) -> MockAsyncTaskCommand<T>`**
*   **`when<T>(predicate: Predicate<T>, commandIfTrue: (message: T) => MockAsyncTaskCommand<T>, commandIfFalse?: (message: T) => MockAsyncTaskCommand<T>) -> MockAsyncTaskCommand<T>`**
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
        actions<MyMessage>([
          // ... other commands ...
          when(
            // Predicate (Type Guard)
            (msg): msg is StartMsg => msg.type === 'START',
            // Command if True (receives narrowed 'startMsg')
            (startMsg) => send(outbox, { type: 'STARTED', id: startMsg.payload.id }),
            // Command if False (receives original 'msg')
            (msg) => send(outbox, { type: 'UNEXPECTED_MSG', receivedType: msg.type })
          ),
          // This command executes after either the 'STARTED' or 'UNEXPECTED_MSG' send completes.
          delay(100)
        ])
        ```

*   **`whileLoop<T>(factory: (commands: { break: () => MockAsyncTaskCommand<T>, continue: () => MockAsyncTaskCommand<T> }) => MockAsyncTaskCommand<T>) -> MockAsyncTaskCommand<T>`**
    *   **Type Name:** Defined as a `MockAsyncTaskCommand`.
    *   **Description:** Creates a command that repeatedly executes a body command sequence. The loop's control flow (termination or continuing to the next iteration) is managed explicitly by executing special `break` or `continue` commands returned by the `factory`.
    *   **Behavior:**
        1.  The runner encounters the `whileLoop` command.
        2.  It enters the loop execution context.
        3.  **Loop Iteration Start:** It calls `factory`, providing an object containing two functions:
            *   `break()`: Returns a special `MockAsyncTaskCommand` instance signaling immediate loop termination.
            *   `continue()`: Returns a special `MockAsyncTaskCommand` instance signaling immediate termination of the *current iteration* and starting the next one.
        4.  The factory returns the `MockAsyncTaskCommand` for the loop body (e.g., `actions(() => [...])`).
        5.  The runner begins executing the commands within the loop body sequence.
        6.  **During Body Execution:**
            *   If the runner executes the special `break` command: The loop terminates immediately. Execution proceeds to the command following the `whileLoop`.
            *   If the runner executes the special `continue` command: The rest of the current iteration's body commands are skipped. Execution jumps back to step 3 (Loop Iteration Start) to begin the next iteration.
            *   If a command within the body terminates the task (e.g., `complete`, `fail`), the loop and the task end.
            *   If the entire loop body sequence completes normally (without hitting `break`, `continue`, or terminating), execution implicitly jumps back to step 3 to begin the next iteration.
    *   **Requires:** Typically used within `withState` if the loop condition or body depends on state, allowing `getState` inside the loop body to call `break()` or `continue()` conditionally.
    *   **Example:**
        ```typescript
        withState(() => ({ count: 0 }), handle =>
          actions<MyMessage>([
            whileLoop((loop) =>
              actions(() => [
                getState(handle, s => {
                  if (s.count >= 3) {
                    return loop.break();
                  } else {
                    return actions(() => [
                      send(outbox, { type: "TICK" }),
                      modifyState(handle, cs => ({ count: cs.count + 1 })),
                      delay(1000)
                    ]);
                  }
                }),
                when((msg): msg is CancelMsg => msg.type === 'CANCEL', () => loop.break())
              ])
            ),
            send(outbox, { type: 'LOOP_ENDED' })
          ])
        )
        ```

*   **`createIterator<T>(generator: (this: CreateIteratorContext<T>) => AsyncGenerator<Array<HandlerAction<T>>, void, T>)`**
    *   **Description:** Provides maximum flexibility by allowing the definition of a custom asynchronous generator function to directly control the mock task's behavior. This bypasses the declarative command structure entirely.
    *   **Behavior:**
        1.  The `createIterator` function invokes the provided `generator` factory function, with the `this` context providing `inbox` and `outbox` actor handles, as well as an asynchronous iterator `next` method that can be used within the generator body to consume messages sent to the async generator.
        2.  The runner then iterates over the returned async generator.
        3.  **Yielding Actions:** When the generator `yield`s an array of `HandlerAction<T>`, the runner processes those actions (sending messages, spawning actors, etc.). Handles for the task itself and for the actor that processes its outbox messages are available via `this.inbox` and `this.outbox` respectively. The generator's execution pauses until the yield completes.
        4.  **Receiving Messages:** The generator can pause its execution and wait for an incoming message `T` by calling `await this.next()`. The `next()` method resolves with the next message delivered to the task.
        5.  **Termination:**
            *   Normal completion occurs when the generator function executes a `return` statement (or reaches its end). The runner observes `{ done: true }`.
            *   Abnormal termination occurs if the generator function `throw`s an error. The runner observes the thrown error.
    *   **Context (`this`):** Inside `createIterator`, `this` provides access to:
        *   `this.inbox: ActorHandle<T>`: Handle for the generator task itself.
        *   `this.outbox: ActorHandle<T>`: Handle for the actor that processes the generator task's output messages.
        *   `this.next(): Promise<T>`: Waits for and returns the next incoming message.
    *   **Example:**
        ```typescript
        createIterator<MyMessage>(async function* () {
          const { inbox, outbox, next } = this;
          // Send an initial ready message
          yield [HandlerAction.Send(outbox, { type: 'READY' })];

          let receivedStop = false;
          while (!receivedStop) {
            // Wait for the next message
            const msg = await next();

            if (msg.type === 'ECHO_REQUEST') {
              // Echo the payload back
              yield [HandlerAction.Send(outbox, { type: 'ECHO_RESPONSE', payload: msg.payload })];
            } else if (msg.type === 'STOP') {
              // Signal stop and exit loop
              yield [HandlerAction.Send(outbox, { type: 'STOPPING' })];
              receivedStop = true;
            }
            // Ignore other message types
          }
          // Generator finishes, task completes normally
        })
        ```
