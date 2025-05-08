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
  waitFor((msg): msg is Extract<MyMessage, { type: "START" }> => msg.type === "START",
    (msgHandle) => send(outbox, readState(msgHandle, (startMsg) => ({ type: "ACK_START", payload: startMsg.payload })))
  ),
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
  waitFor((msg): msg is Extract<MyMessage, { type: "BEGIN" }> => msg.type === "BEGIN"),
  send(outbox, { type: "WORKING" }),
  delay(200),
  send(outbox, { type: "COMPLETE" })
]))
```

### 2.2 State Management

```typescript
// Using readState to send a message with state data
act((self, { outbox }) => 
  withState(() => ({ progress: 0 }), stateHandle => actions(() => [
    // Update state
    modifyState(stateHandle, s => ({ progress: s.progress + 0.1 })),
    
    // Emit based on state using readState
    send(outbox, readState(stateHandle, s => ({ type: "PROGRESS", value: s.progress })))
  ]))
)

// State-based retry logic using computeState and readState
act((self, { outbox }) => 
  withState(() => ({ retries: 0 }), stateHandle => actions(() => [
    modifyState(stateHandle, s => ({ retries: s.retries + 1 })),
    send(outbox, readState(stateHandle, s => ({ type: "ATTEMPT", count: s.retries }))),
    delay(readState(stateHandle, s => Math.pow(2, s.retries) * 100))
  ]))
)
```

### 2.3 Control Flow

```typescript
// Conditional execution in response to incoming message using 'when'
act((self, { outbox }) => when(
  (msg): msg is Extract<MyMessage, {type: "START", payload: { ready: boolean }}> => msg.type === "START",
  (msgHandle) => send(outbox, readState(msgHandle, (startMsg) => startMsg.payload.ready ? { type: "READY" } : { type: "NOT_READY" })),
  (msgHandle) => send(outbox, { type: "UNKNOWN_MESSAGE" }) // Optional: if predicate is false and no specific type guard failed
))

// State-based conditions using 'whenState' and 'computeState' for complex predicates
act((self, { outbox, fail }) => 
  withState(() => ({ retries: 0, maxRetries: 3, otherCondition: true }), stateHandle =>
    // Example: Simulating a process that might fail and need retries
    actions(() => [
      // Some initial action
      send(outbox, { type: "INITIATE_PROCESS" }),
      waitFor((msg): msg is Extract<MyMessage, { type: "PROCESS_RESPONSE", status: string }> => msg.type === "PROCESS_RESPONSE",
        (msgHandle) => {
          return whenState(
            // Predicate 1: Should we retry?
            computeState(
              [msgHandle, stateHandle],
              (responseMsg, appState) => responseMsg.status === "FAIL" && appState.retries < appState.maxRetries
            ),
            // If shouldRetry is true:
            actions(() => [
              modifyState(stateHandle, s => ({ ...s, retries: s.retries + 1 })),
              send(outbox, readState(stateHandle, s => ({ type: "RETRYING", attempt: s.retries }))),
            ]),
            // If shouldRetry is false (i.e., success or retries exhausted):
            whenState(
              // Predicate 2: Was it a failure (for the final decision)?
              readState(msgHandle, (responseMsg) => responseMsg.status === "FAIL"),
              fail(new Error("Process failed after multiple retries")), // If it was a failure, and we are not retrying, then fail task
              send(outbox, { type: "PROCESS_SUCCESS" }) // Otherwise, it was a success
            )
          );
        }
      )
    ])
  )
)


// While loop for autonomous repeated actions using whenState and readState
act<MyMessage>((self, { outbox }) => (
  withState(() => ({ count: 0 }), stateHandle =>
    actions<MyMessage>(() => [
      whileLoop((loop) =>
        actions(() => [
          // Conditional break or continue based on state
          whenState(
            readState(stateHandle, s => s.count >= 3),
            loop.break(), // If count >= 3, break
            actions(() => [ // Else, continue loop actions
              send(outbox, { type: "TICK" }),
              modifyState(stateHandle, cs => ({ count: cs.count + 1 })),
              delay(1000)
            ])
          ),
          // Conditional break based on incoming message
          when((msg): msg is CancelMsg => msg?.type === 'CANCEL',
             (msgHandle) => loop.break()
          )
        ])
      ),
      send(outbox, { type: 'LOOP_ENDED' })
    ])
  )
))
```

## Implementation Details

Mock tasks are defined using the `act` factory function. This function provides a context and helper utilities to construct the task's behavior declaratively.

A `StateValueResolver<V>` is an opaque type representing a value that will be resolved from state at runtime. Many command parameters can accept either a direct value (e.g., a `number` for a duration) or a `StateValueResolver<V>` for that value type, allowing for dynamic values derived from state. This dual capability is noted in individual command descriptions where applicable.
A `StateHandle<S>` is an opaque handle to a state of type `S`. 
    *   When created by `withState`, the `stateHandle` is valid for all lexically nested commands within that `withState` block and its factory function.
    *   When provided to a factory by commands like `waitFor` or `when` (representing a consumed message), this `messageHandle` is a temporary handle valid only within the scope of that specific factory function callback.

*   **`act<T>(definition: (self: ActorHandle<T>, helpers: { outbox: ActorHandle<T>, complete: () => MockAsyncTaskCommand<T>, fail: (error: Error) => MockAsyncTaskCommand<unknown> }) => MockAsyncTaskCommand<T>) -> MockAsyncTaskDefinition<T>`**
    *   **Description:** The main factory function for creating a declarative mock task definition. It accepts a `definition` function callback that outlines the task's lifecycle, interactions, and responses to incoming messages. The `definition` function must return a single `MockAsyncTaskCommand` (commonly `actions(...)` or `withState(...)`) which serves as the root of the task's behavior tree.
    *   **Type Parameters:**
        *   `T`: The union type of messages that the mock task can receive and (typically) send. The `self` handle represents this actor.
    *   **Parameters:**
        *   `definition`: `(self: ActorHandle<T>, helpers: { outbox: ActorHandle<T>, complete: () => MockAsyncTaskCommand<T>, fail: (error: Error) => MockAsyncTaskCommand<unknown> }) => MockAsyncTaskCommand<T>`
            A callback function invoked to build the task's behavior. It receives two arguments:
            *   `self: ActorHandle<T>`: An `ActorHandle` representing the mock task itself.
            *   `helpers`: An object containing essential helper utilities: `outbox`, `complete`, `fail`.
                *   `outbox: ActorHandle<T>`: Handle for the actor receiving messages from this mock task.
                *   **`complete(): MockAsyncTaskCommand<T>`**: Command to terminate the task normally.
                *   **`fail(error: Error): MockAsyncTaskCommand<unknown>`**: Command to terminate the task with an error.
    *   **Return Value:** `MockAsyncTaskDefinition<T>`: An opaque definition object.
    *   **Example (Overall Structure):**
        ```typescript
        interface MyMessage { type: "PING" | "PONG" | "INIT_DATA"; payload?: any; }
        interface MyState { initialized: boolean; data?: any; }

        const myMockTaskDefinition = act<MyMessage>((self, { outbox, complete, fail }) =>
          withState<MyState, MyMessage>(() => ({ initialized: false }), stateHandle =>
            actions(() => [
              waitFor((msg): msg is Extract<MyMessage, { type: "INIT_DATA" }> => msg.type === "INIT_DATA",
                (msgHandle) => actions(() => [
                  send(outbox, readState(msgHandle, (initMsg) => ({ type: "PONG", payload: initMsg.payload }))),
                  modifyState(stateHandle, readState(msgHandle, (initMsg) => (s) => ({ ...s, initialized: true, data: initMsg.payload })))
                ])
              ),
              whenState(
                readState(stateHandle, s => !s.initialized),
                fail(new Error("Task was not initialized before other interactions.")),
                send(outbox, { type: "PONG" }) // Send another PONG if initialized
              ),
              complete()
            ])
          )
        );
        ```

This section provides a detailed breakdown of each mock task action's behavior. 

*   **`send<T>(target: ActorHandle<T>, message: T | StateValueResolver<T>) -> MockAsyncTaskCommand<T, HandlerAction<T>>`**
    *   **Description:** Immediately yields the specified message (or a message resolved from state) from the mock task's iterator. The message is automatically wrapped in a `HandlerAction.Send(target, message)` internally.
    *   **Behavior:** If `message` is a `StateValueResolver`, it's resolved using the relevant state. The task then yields `[HandlerAction.Send(target, resolvedMessage)]`. Execution continues immediately.
    *   **Example:**
        ```typescript
        // Literal message
        send(outbox, { type: "DATA", value: 42 })
        
        // Message from state
        withState(() => ({ id: "123" }), idHandle => 
          send(outbox, readState(idHandle, s => ({ type: "USER_ID", id: s.id })))
        )
        ```

*   **`kill<T>(target: ActorHandle<T>) -> MockAsyncTaskCommand<unknown>`**
    *   **Description:** Immediately yields a `HandlerAction.Kill` for the specified `target` actor handle.
    *   **Behavior:** The mock task's underlying async generator yields `[HandlerAction.Kill(target)]`.
    *   **Example:**
        ```typescript
        actions(() => [
          send(outbox, { type: 'INITIALIZING' }),
          delay(50),
          kill(self), 
          send(outbox, { type: 'THIS_WONT_RUN' }) 
        ])
        ```

*   **`waitFor<T, TNarrowed extends T>(predicate: ((message: T) => message is TNarrowed) | StateValueResolver<((message: T) => message is TNarrowed)>, commandIfTrue?: (messageHandle: StateHandle<TNarrowed>) => MockAsyncTaskCommand<T>) -> MockAsyncTaskCommand<T>`**
    *   **Description:** Pauses task execution until an incoming message satisfies the `predicate`. If a `commandIfTrue` is provided, it's invoked with a `StateHandle` for the consumed message (type-narrowed). The factory returns a command to be executed. To access message fields within the factory, use `readState(messageHandle, msg => ...)`. The `messageHandle` is temporary and valid only within the `commandIfTrue` callback.
    *   **Behavior:**
        1.  Task pauses. If `predicate` is a `StateValueResolver`, it's resolved.
        2.  On message arrival, evaluate `resolvedPredicate(message)`.
        3.  **If `false`:** Consume and discard. Continue waiting.
        4.  **If `true`:**
            *   Consume message. Create a temporary `StateHandle` for it.
            *   If `commandIfTrue` exists, call `commandIfTrue(messageHandle)`. Execute the returned command.
            *   Proceed to the next action.
    *   **Example (Type Guard & Processor Factory):**
        ```typescript
        waitFor<MyMessage, StartMsg>(
          (msg): msg is StartMsg => msg.type === 'START',
          (msgHandle) => send(outbox, readState(msgHandle, (startMsg) => ({ type: 'ACK', id: startMsg.payload.id })))
        )
        ```
    *   **Example (Wait Only):**
        ```typescript
        waitFor<MyMessage>(msg => msg.type === 'COMPLETE')
        ```

*   **`delay<T>(durationMs: number | StateValueResolver<number>) -> MockAsyncTaskCommand<T>`**
    *   **Description:** Pauses execution for the specified duration. This duration can be a literal `number` (in milliseconds) or a `StateValueResolver<number>` to dynamically determine the delay from state at runtime.
    *   **Behavior:** If `durationMs` is a `StateValueResolver`, it's resolved. The task then waits for the resolved duration. Commands in a sequence are executed sequentially; for instance, a `delay` command will fully complete before any subsequent command (like `waitFor` or `when`) begins execution. Messages arriving from external sources while a `delay` (or any other non-message-consuming command) is active are typically buffered by the underlying actor system and will be processed by the next relevant message-consuming command (e.g., `waitFor`, `when`) once it becomes active.
    *   **Example:**
        ```typescript
        // Literal duration
        delay(100)
        
        // Duration from state
        withState(() => ({ waitTime: 200 }), timeHandle => 
          delay(readState(timeHandle, s => s.waitTime))
        )
        ```

*   **`none<T>() -> MockAsyncTaskCommand<T>`**
    *   **Description:** A no-operation command.
    *   **Behavior:** The runner skips this command.
    *   **Example:**
        ```typescript
        whenState(
          readState(someHandle, s => s.shouldIgnore),
          none(), // Do nothing if condition is true
          send(outbox, { type: 'PROCESS' })
        )
        ```

*   **`actions<T>(commands: (controls: { done: () => MockAsyncTaskCommand<T> }) => Array<MockAsyncTaskCommand<T>>)`**
    *   **Description:** Executes a sequence of commands. The factory function receives `controls.done()` which can be called to terminate the current `actions` block early.
    *   **Behavior:** Executes commands in the provided order. If `controls.done()` is called, execution of the current `actions` block halts, and control passes to the command following the `actions` block. If `done()` is not called, the sequence completes after the last command in the array, and then control proceeds.
    *   **Example:** (See various examples throughout)

*   **`withState<S, T>(initialState: () => S | StateValueResolver<() => S>, factory: (stateHandle: StateHandle<S>) => MockAsyncTaskCommand<T>)`**
    *   **Description:** Defines a stateful command scope. It creates an initial state and provides a `stateHandle` to the `factory` function. The `factory` returns a command that operates within this state scope.
    *   **Behavior:**
        1.  Invokes `initialState()` to get the state value (resolving it first if it's a `StateValueResolver`).
        2.  Creates a `stateHandle` for this state.
        3.  Invokes `factory(stateHandle)` to get the command body for this stateful block.
        4.  Commands like `modifyState`, `readState`, and `computeState` use this `stateHandle`.
    *   **Example (Structure):**
        ```typescript
        act<MyMessage>((self, { outbox, complete }) => (
          withState(() => ({ counter: 0 }), stateHandle => actions<MyMessage>([
            modifyState(stateHandle, s => ({ counter: s.counter + 1 })),
            whenState(
              readState(stateHandle, s => s.counter >= 3),
              complete(), // Complete if counter is 3 or more
              send(outbox, readState(stateHandle, s => ({ type: 'COUNT', value: s.counter })))
            ),
            delay(100)
          ]))
        ));
        ```

*   **`modifyState<S, T>(stateHandle: StateHandle<S>, updater: (currentState: S) => S) -> MockAsyncTaskCommand<T>`**
    *   **Description:** Synchronously updates the state associated with `stateHandle`.
    *   **Behavior:** Retrieves current state, calls `updater`, updates state with the new value.
    *   **Example (within `withState` -> `actions`):**
        ```typescript
        withState(() => ({ count: 0 }), stateHandle =>
          actions<MyMessage>([ 
            modifyState(stateHandle, s => ({ count: s.count + 1 })),
          ])
        )
        ```

*   **`readState<S, V>(stateHandle: StateHandle<S>, selector: (currentState: S) => V): StateValueResolver<V>`**
    *   **Description:** Creates a `StateValueResolver`. This is not a command itself, but a helper to produce a placeholder that is dynamically resolved at runtime to retrieve a value from state. This resolved value is then used as an argument to another command (e.g., `send`, `delay`).
    *   **Behavior:** Returns an opaque `StateValueResolver` object containing the `stateHandle` and the `selector`. The command execution engine uses this to fetch the actual value from state when needed.
    *   **Example:**
        ```typescript
        // Used with send:
        send(outbox, readState(dataHandle, s => ({ type: "CURRENT_DATA", payload: s.info })));

        // Used with delay:
        delay(readState(configHandle, s => s.timeoutMs));
        ```

*   **`computeState<S extends unknown[], R>(handles: Readonly<{[K in keyof S]: StateHandle<S[K]>}>, computer: (...values: S) => R): StateValueResolver<R>`**
    *   **Description:** Creates a `StateValueResolver` for a derived value `R`. It takes a tuple of `StateHandle`s and a `computer` function.
    *   **Behavior:** When resolved by the interpreter:
        1.  Each `StateHandle` in `handles` is resolved to its current state value.
        2.  The `computer` function is called with these resolved state values in the same order as the handles.
        3.  The return value of `computer` is the result of this `computeState` operation, wrapped as a `StateValueResolver`.
    *   **Type Parameters:**
        *   `S`: A tuple type representing the types of the states managed by the input `handles` (e.g., `[StateType1, StateType2]`).
        *   `R`: The type of the value returned by the `computer` function.
    *   **Example:**
        ```typescript
        const greetingResolver = computeState(
          [appStateHandle, userPrefsHandle],
          (appState, userPrefs) => 
            `Hello, ${appState.name}! Your lang is ${userPrefs.preferredLang} on theme ${appState.settings.theme}.`
        );
        ```

*   **`whenState<T>(predicateResolver: StateValueResolver<boolean>, commandIfTrue: MockAsyncTaskCommand<T>, commandIfFalse?: MockAsyncTaskCommand<T>): MockAsyncTaskCommand<T>`**
    *   **Description:** Conditionally executes a command based on a `StateValueResolver<boolean>`. The `predicateResolver` is typically created using `readState` (for single state dependency) or `computeState` (for multiple state dependencies).
    *   **Behavior:** Resolves `predicateResolver` to a boolean. Executes `commandIfTrue` or `commandIfFalse`.
    *   **Example:**
        ```typescript
        withState(() => ({ status: 'idle', userRole: 'user' }), appStateHandle =>
          withState(() => ({ isLocked: true }), itemStateHandle => 
            actions<MyMessage>([
              whenState(
                computeState(
                  [appStateHandle, itemStateHandle],
                  (appState, itemState) => 
                    appState.status === 'active' && 
                    appState.userRole === 'admin' && 
                    !itemState.isLocked
                ),
                send(outbox, { type: 'PERFORM_ADMIN_ACTION' }), 
                send(outbox, { type: 'CANNOT_PERFORM_ACTION' })
              )
            ])
          )
        )
        ```

*   **`when<T, TNarrowed extends T>(predicate: ((message: T) => message is TNarrowed) | StateValueResolver<((message: T) => message is TNarrowed)>, commandIfTrue: (messageHandle: StateHandle<TNarrowed>) => MockAsyncTaskCommand<T>, commandIfFalse?: (messageHandle: StateHandle<T>) => MockAsyncTaskCommand<T>): MockAsyncTaskCommand<T>`**
    *   **Description:** Waits for the next incoming message from the actor's inbox, consumes it, and then conditionally executes a command returned by one of two factories based on the `predicate`. This command *always* consumes one message upon invocation, regardless of whether its predicate is state-based or directly uses the message content. The factories receive a `StateHandle<T>` for the incoming message (type-narrowed to `TNarrowed` for `commandIfTrue` if the predicate is a type guard), allowing message fields to be accessed via `readState(messageHandle, ...)`. This `messageHandle` is temporary and valid only within its respective factory callback (`commandIfTrue` or `commandIfFalse`).
    *   **Behavior:**
        1.  Awaits an incoming message and consumes it from the inbox.
        2.  Creates temporary `StateHandle` for the message.
        3.  Evaluates `predicate` (resolving it first if it's a `StateValueResolver`) with the message.
        4.  If `true`, calls `commandIfTrue(messageHandle)` and executes the returned command.
        5.  If `false`, calls `commandIfFalse(messageHandle)` (if provided) and executes its result.
    *   **Example:**
        ```typescript
        actions<MyMessage>([
          when<MyMessage, StartMsg>(
            (msg): msg is StartMsg => msg.type === 'START',
            (msgHandle) => send(outbox, readState(msgHandle, (startMsg: StartMsg) => ({ type: 'STARTED', id: startMsg.payload.id }))),
            (msgHandle) => send(outbox, readState(msgHandle, (msg: MyMessage) => ({ type: 'UNEXPECTED_MSG', receivedType: msg.type })))
          ),
          delay(100)
        ])
        ```

*   **`whileLoop<T>(factory: (commands: { break: () => MockAsyncTaskCommand<T>, continue: () => MockAsyncTaskCommand<T> }) => MockAsyncTaskCommand<T>) -> MockAsyncTaskCommand<T>`**
    *   **Description:** Creates a command that repeatedly executes a body command sequence provided by the `factory` function. Loop control (`break`, `continue`) is explicit via the `commands` object passed to the factory. State-dependent logic within the loop body should use `whenState` or `readState` with a lexically captured `StateHandle`.
    *   **Behavior:** Executes the command returned by `factory` repeatedly. `commands.break()` terminates the loop. `commands.continue()` immediately skips to the next iteration, re-evaluating the factory. If the command sequence returned by the `factory` completes without an explicit `commands.break()` or `commands.continue()` being called, the loop implicitly continues to the next iteration.
    *   **Example:**
        ```typescript
        withState(() => ({ count: 0 }), handle =>
          actions<MyMessage>([
            whileLoop((loop) =>
              actions(() => [
                whenState(
                  readState(handle, s => s.count >= 3),
                  loop.break(), // Break if count >= 3
                  actions(() => [ // Else continue
                    send(outbox, { type: "TICK" }),
                    modifyState(handle, cs => ({ count: cs.count + 1 })),
                    delay(1000)
                  ])
                ),
                // Also listen for an external cancel message
                when((msg): msg is CancelMsg => msg.type === 'CANCEL', 
                  (msgHandle) => loop.break()
                ) 
              ])
            ),
            send(outbox, { type: 'LOOP_ENDED' })
          ])
        )
        ```
