## Declarative Actor System

The Declarative Actor System provides a declarative API for defining the behavior of ReactiveKit actors, allowing precise control over timing and message sequences.

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

Actor definitions are created using the `act` factory function. This function provides a context and helper utilities to configure the actor's behavior declaratively using the command combinators.

### Actor state

Declarative actors can define internal state.

A `StateHandle<S>` is an opaque handle to a state of type `S`. 
    *   When created by `withState`, the `stateHandle` is valid for all lexically nested commands within that `withState` block and its factory function.
    *   When provided to a factory by commands like `waitFor` or `when` (representing a consumed message), this `messageHandle` is a temporary handle valid only within the scope of that specific factory function callback.

A `StateValueResolver<V>` is an opaque type representing a value that will be resolved from a state handle at runtime. Many command parameters can accept either a direct value (e.g., a `number` for a duration) or a `StateValueResolver<V>` for that value type, allowing for dynamic values derived from state. This dual capability is noted in individual command descriptions where applicable.

### Internal Architecture

The `act()` function, when invoked with an actor definition, doesn't directly execute the described behavior. Instead, it compiles the declarative actor definition into a sequence of virtual machine (VM) instructions. This sequence is then internally executed by a lightweight, stack-based interpreter.

#### 1. VM Architecture overview

The core components of the internal VM are:

*   **Instruction Queue:** A list of VM instructions derived from the user's `ActorCommand` definitions. The `act` function effectively translates the command tree into a linear sequence of these instructions.
*   **Execution Stack (VM Stack):** A runtime stack used to manage control flow, store intermediate values, and manage lexically-scoped state. `StateHandle`s created by `withState` refer to data held within specific frames on this stack. It is distinct from any JavaScript call stack.
*   **Instruction Pointer (IP):** A pointer that indicates the next VM instruction to be fetched and executed from the Instruction Queue.
*   **Execution Engine:** A central loop that fetches the instruction at the current IP, decodes it, and dispatches it to the appropriate handler logic. This engine also manages interactions with the actor system for message passing and timers.

When an actor definition begins execution, the `ActorDefinition` (the output of `act(...)`) is processed. The VM is initialized with the instruction sequence, an empty stack, and its IP set to the start of the sequence. The execution engine then runs until a terminal instruction (like `complete` or `fail`) is encountered, or until the instruction queue is exhausted under normal completion.

#### 2. VM Instruction Set

The declarative commands provided in an actor definition (e.g., `send`, `waitFor`, `withState`) are compiled into a lower-level VM instruction set. Each instruction is a simple operation that the VM's execution engine can process. The translation from the high-level API to VM instructions aims to flatten the nested structure of commands into a linear sequence where possible, with control flow instructions managing jumps and conditional execution.

The instruction set can be broadly categorized:

*   **Core Task Operations:**
    *   `SEND_MESSAGE`: Corresponds to `send()`. Takes a target actor handle and a message (or a resolver for a message) as operands.
    *   `COMPLETE_TASK`: Corresponds to `helpers.complete()`. Terminates the task successfully.
    *   `FAIL_TASK`: Corresponds to `helpers.fail()`. Terminates the task with an error.
    *   `KILL_ACTOR`: Corresponds to `kill()`. Takes a target actor handle.
    *   `NOOP`: Corresponds to `none()`.

*   **State Management Operations:**
    *   `PUSH_STATE`: Marks the beginning of a `withState` block. Initializes the state and pushes its handle onto the VM stack or a dedicated part of the current stack frame. The operand would be the initial state (or a resolver for it).
    *   `POP_STATE`: Marks the end of a `withState` block, removing the state scope.
    *   `MODIFY_STATE`: Corresponds to `modifyState()`. Takes a state handle (resolved from the stack) and an updater function.
    *   *Note: `readState` and `computeState` don't necessarily translate to dedicated VM instructions. Instead, they are operands to other instructions (like `SEND_MESSAGE`, `JUMP_IF_STATE`, `DELAY`). The VM resolves these `StateValueResolver`s at the point the consuming instruction is executed.*

*   **Control Flow Operations:**
    *   `AWAIT_MESSAGE`: Corresponds to `waitFor()`. Pauses execution. Takes a predicate. If the predicate has a `commandIfTrue` factory, this instruction might be followed by instructions generated from that factory, or a conditional jump.
    *   `DELAY`: Corresponds to `delay()`. Pauses execution. Takes a duration (or a resolver for it).
    *   `JUMP`: Unconditional jump to a different IP. Used to implement loops and the `actions()` `done()` control.
    *   `JUMP_IF_STATE`: Corresponds to `whenState()`. Takes a `StateValueResolver<boolean>` and a target IP for the "true" branch. The "false" branch is typically the next instruction in sequence or an explicit `JUMP`.
    *   `JUMP_IF_MESSAGE`: Corresponds to `when()`. Consumes a message, evaluates a predicate against it. Takes a target IP for the "true" branch. The "false" branch is handled similarly. The factories (`commandIfTrue`, `commandIfFalse`) from `when()` would compile to instruction sub-sequences.
    *   `ENTER_LOOP / EXIT_LOOP_IF / CONTINUE_LOOP`: Instructions to manage `whileLoop()`. `ENTER_LOOP` might set up a loop context on the stack. `EXIT_LOOP_IF` would check a condition (often involving a `StateValueResolver` or a message predicate) and jump out of the loop. `CONTINUE_LOOP` would jump to the beginning of the loop's body.
    *   `PUSH_BLOCK`: The `actions()` command translates to a sequence of instructions. `PUSH_BLOCK` might set up a new frame or marker on the stack to handle `controls.done()`.
    *   `POP_BLOCK`: `controls.done()` would compile to a `JUMP` instruction targeting after the corresponding `POP_BLOCK`.

*   **Operand Types:** Instructions operate on various types of operands, including:
    *   Literal values (numbers, strings, booleans).
    *   `ActorHandle`s.
    *   `StateValueResolver`s (which the VM resolves at runtime).
    *   IP offsets or labels for jump targets.

This instruction set allows the VM to interpret the complex, declarative actor definitions by breaking them down into manageable, sequential steps with explicit control flow. The compilation process (from `ActorCommand` tree to linear VM instructions) is a key part of `act()`'s internal setup.

#### 3. VM Stack and State Management

The VM's execution stack is central to its operation, serving not only for control flow but also for managing the lifecycle of stateful contexts introduced by `withState` and temporary message data.

*   **Stack Frames:**
    *   The stack is composed of frames. A new frame might be pushed for contexts like `actions()` blocks (especially if they need to manage `controls.done()` jumps), `whileLoop()` iterations, or when `withState()` introduces a new lexical state scope.
    *   Frames hold information such as the return Instruction Pointer (IP) for when a block or scope finishes, and local data relevant to that scope.

*   **State Scopes and `StateHandle` Resolution:**
    *   When a `PUSH_STATE` instruction (generated from `withState`) is executed, the initial state value (potentially resolved from a `StateValueResolver` itself) is computed and stored within the current or a newly created stack frame.
    *   A `StateHandle` provided to the user's factory function is, internally, a reference that allows the VM to locate this state data on the stack. This could be an index into a specific part of a stack frame or a pointer to a memory region managed by the frame.
    *   `readState` and `computeState` operations, when encountered as operands to other instructions, use these internal `StateHandle` references to access the appropriate data from the relevant stack frame(s). The VM traverses the stack (or uses a more direct pointer if the handle encodes its frame) to find the frame containing the state associated with the handle.
    *   The `POP_STATE` instruction removes the state data from the stack, effectively ending the lexical scope of that `StateHandle`. This typically occurs when the stack frame associated with the `withState` block is popped.

*   **Temporary Message Handles:**
    *   Commands like `AWAIT_MESSAGE` and `JUMP_IF_MESSAGE` consume an incoming message. If their associated factory functions (e.g., `commandIfTrue` in `waitFor` or `when`) are invoked, a temporary `StateHandle` for the consumed message is created.
    *   The data for this message (the message object itself) is also stored on the stack, typically in the current frame, and the temporary `StateHandle` points to it.
    *   This message-specific `StateHandle` is only valid for the duration of the factory callback's execution. Once the instructions generated from that factory complete, the part of the stack frame holding the message data might be reclaimed or marked as invalid.

*   **Control Flow Information:**
    *   The stack stores return addresses for jumps (e.g., after a `PUSH_BLOCK` completes or a loop iteration finishes).
    *   For `whileLoop`, the stack might hold information about the loop's start IP to allow `CONTINUE_LOOP` to jump back, and status flags or counters if needed (though most loop logic will rely on `StateHandle`s).

*   **`StateValueResolver`s:**
    *   These are not directly stored on the stack as persistent entities but are operands to VM instructions.
    *   When an instruction like `SEND_MESSAGE` has a `StateValueResolver` as its message operand, or `JUMP_IF_STATE` has one as its predicate, the VM's execution logic for that instruction is responsible for:
        1.  Identifying the `StateHandle`(s) within the resolver.
        2.  Using these handles to retrieve the current state value(s) from the stack.
        3.  Executing the resolver's `selector` or `computer` function with these values.
        4.  Using the result to proceed with the instruction (e.g., sending the resolved message, making the jump decision).

This tight integration of state management with the stack ensures that state lifetimes are naturally coupled to their lexical scopes, simplifying the VM's design.

#### 4. VM and Runner: Cooperative Execution Model

The execution of an actor definition, created using the `act()` function and its command combinators, is managed by a cooperative interplay between two main components:

1.  **The Virtual Machine (VM):** Implemented as a synchronous generator function. The VM is responsible for interpreting the compiled sequence of instructions derived from the actor definition. It processes instructions related to internal state management, synchronous control flow (like conditional jumps based on state), and preparing descriptors for external actions. When an instruction requires interaction with the outside world (e.g., sending a message, waiting for a delay, or awaiting an incoming message), the VM yields a command descriptor and pauses its execution.

2.  **The External Runner:** An asynchronous JavaScript function or component that "drives" the VM generator. The runner initiates the VM by calling its `next()` method. It then receives command descriptors yielded by the VM. Based on these descriptors, the runner performs the actual asynchronous operations (e.g., interfacing with the actor system for message passing, managing timers) or handles task lifecycle events. Once an asynchronous operation completes or an event occurs, the runner resumes the VM by calling `generator.next(result)`, passing any relevant data (like a received message) back into the VM.

This division of labor allows the VM's core logic to remain relatively simple and synchronous, focusing on instruction interpretation and state transitions. The runner, on the other hand, handles the complexities of asynchronous event management and interaction with the broader JavaScript environment and the ReactiveKit actor system.

The overall flow is as follows:
*   The runner starts the VM generator.
*   The VM executes instructions internally until it needs to perform an external action or wait for an event.
*   The VM `yields` a command descriptor to the runner.
*   The runner processes the command, performs any necessary asynchronous operations, and waits for completion/events.
*   The runner calls `generator.next(result)` to resume the VM.
*   This cycle repeats until the VM completes its instruction sequence (e.g., by yielding a `COMPLETE` or `FAIL` descriptor, or by the generator function returning).

The following subsections detail the internal workings of the VM's execution cycle and the specific responsibilities of the external runner.

##### 4.1. Internal VM Execution Cycle

The VM generator's core is an internal execution loop that processes instructions from the Instruction Queue. This loop runs synchronously within each invocation of `generator.next()` by the external runner.

*   **The Main Loop:**
    *   The loop continues as long as the Instruction Pointer (IP) is within the bounds of the Instruction Queue and no terminal instruction (like `COMPLETE_TASK` or `FAIL_TASK`) has been executed or yielded.
    *   In each iteration, the engine performs the following steps:
        1.  **Fetch:** Retrieve the instruction located at the current IP from the Instruction Queue.
        2.  **Decode (Implicit):** The instruction's type (e.g., `SEND_MESSAGE`, `JUMP_IF_STATE`) determines the operation to be performed. Operands are part of the instruction structure.
        3.  **Execute:** Dispatch the instruction to its corresponding handler logic. This is where the primary work of the VM occurs.
        4.  **Advance IP:** Typically, the IP is incremented to point to the next instruction in sequence. However, control flow instructions (like `JUMP`, `JUMP_IF_STATE`) will modify the IP according to their specific logic. For instructions that `yield`, the IP might not be advanced until the generator is resumed.

*   **Instruction Dispatch:**
    *   The VM contains a set of handler functions, one for each type of VM instruction (e.g., a handler for `SEND_MESSAGE`, another for `PUSH_STATE`, etc.).
    *   The "execute" step involves calling the appropriate handler based on the fetched instruction's type.
    *   Each handler function implements the semantics of its instruction:
        *   It may interact with the VM stack (pushing/popping frames or values).
        *   It may resolve `StateValueResolver`s if they are operands.
        *   It may modify the IP (e.g., for jumps).
        *   For asynchronous operations, it prepares a command descriptor to be `yield`ed by the generator.

*   **Synchronous vs. Asynchronous Instructions (Generator Model):**
    *   Many instructions execute synchronously within the generator's internal loop (e.g., `NOOP`, `PUSH_STATE`, `MODIFY_STATE`, `JUMP`). Their handlers complete their work, update the IP, and the loop immediately proceeds to the next instruction within the same call to `generator.next()`.
    *   Some instructions are inherently asynchronous, requiring interaction with the external environment (e.g., `AWAIT_MESSAGE`, `DELAY`, `SEND_MESSAGE`). When such an instruction is encountered by the generator's internal loop:
        *   Its handler logic prepares a command descriptor (e.g., `{ type: 'DELAY', duration: 100 }`, `{ type: 'AWAIT_MESSAGE' }`, or `{ type: 'SEND', target: ..., message: ... }`).
        *   The generator then `yields` this command descriptor, pausing its execution. The IP is typically not advanced by the generator for these yielded instructions; it will resume at the same IP when `next()` is called again by the runner.
        *   Upon resumption (via `generator.next(result)` from the runner), the generator's internal loop continues from where it paused. It may use the `result` passed to `next()` to complete the processing of the asynchronous instruction (e.g., placing a received message onto the stack) before advancing the IP.

This internal cycle allows the VM to manage its state and control flow deterministically, preparing command descriptors for any operations that require external handling by the runner.

##### 4.2. External Runner and Asynchronous Event Management

The external runner is responsible for driving the VM generator and managing all interactions with the asynchronous environment and the actor system. Its key duties are detailed below.

*   **Processing Yielded Command Descriptors:**
    *   The VM `yields` command descriptor objects when it requires an external action or needs to pause for an event. These descriptors define the operation and its parameters. Examples include:
        *   `SEND_MESSAGE`: `{ type: 'SEND', targetActor: ActorHandle, message: any }`
        *   `KILL_ACTOR`: `{ type: 'KILL', targetActor: ActorHandle }`
        *   `DELAY`: `{ type: 'DELAY', durationMs: number }`
        *   `AWAIT_MESSAGE`: `{ type: 'AWAIT_MESSAGE' }` (The VM internally manages any associated predicate).
    *   Terminal conditions are also communicated:
        *   `COMPLETE_TASK`: via `{ type: 'COMPLETE' }` or generator return.
        *   `FAIL_TASK`: via `{ type: 'FAIL', error: Error }` or generator throwing an error.

*   **Core Runner Loop and Responsibilities:**
    *   The runner initiates the VM by calling `generator.next()` for the first time.
    *   It then enters a loop, processing values yielded by the generator:
        1.  Receives the yielded command descriptor.
        2.  Interprets the `type` of the command.
        3.  Performs the actual asynchronous operation or handles the event:
            *   For `SEND_MESSAGE`: Interacts with the ReactiveKit actor system to dispatch the message.
            *   For `KILL_ACTOR`: Interacts with the actor system to terminate the target.
            *   For `DELAY`: Interacts with the runtime environment to pause for the specified duration.
            *   For `AWAIT_MESSAGE`: Waits for an incoming message for the actor (details below).
            *   For `COMPLETE` or `FAIL`: Finalizes the actor's lifecycle.
        4.  Once the operation is complete or the event occurs (e.g., timer expired, message received), the runner calls `generator.next(result)` to resume the VM. The `result` is the received message for `AWAIT_MESSAGE` states, or typically `undefined` for others like `DELAY`.

*   **Message Handling by the Runner:**
    *   **Buffering:** The runner should implement a message buffer for the actor. If messages arrive from the actor system while the VM generator is paused for other reasons (e.g., `DELAY`) or while the runner is processing a previous command, these messages are queued. When the VM yields `AWAIT_MESSAGE`, the runner first checks this buffer before waiting for new messages from the actor system.
    *   **Resuming VM on Message Arrival:** When `AWAIT_MESSAGE` is active, and a message is available (either from the buffer or newly arrived), the runner passes this message as the `result` to `generator.next()`. The VM is then responsible for any predicate evaluation to determine if the message is the one it was waiting for (as detailed in 4.1 under how `AWAIT_MESSAGE` and related instructions like `JUMP_IF_MESSAGE` are processed by the VM). If the VM determines the message is not suitable (for a `waitFor`), it will re-yield `AWAIT_MESSAGE`.

*   **Task Lifecycle Integration:**
    *   The runner manages the overall lifecycle of the actor (e.g., the `AsyncTask` instance representing the actor's execution). It translates the VM's terminal state (`COMPLETE` or `FAIL` descriptors) into the appropriate resolution or rejection of this actor's execution, making the outcome observable to the testing framework.

This cooperative model allows the VM's internal logic to remain synchronous and focused on instruction execution, while the runner handles the complexities of asynchronous operations and event management.

### Top-level APIs

*   **`act<T>(definition: (self: ActorHandle<T>, helpers: { outbox: ActorHandle<T>, complete: () => ActorCommand<T>, fail: (error: Error) => ActorCommand<unknown> }) => ActorCommand<T>) -> ActorDefinition<T>`**
    *   **Description:** The main factory function for creating a declarative actor definition. It accepts a `definition` function callback that outlines the actor's lifecycle, interactions, and responses to incoming messages. The `definition` function must return a single `ActorCommand` (commonly `actions(...)` or `withState(...)`) which serves as the root of the actor's behavior tree.
    *   **Type Parameters:**
        *   `T`: The union type of messages that the actor defined by this definition can send and receive
    *   **Parameters:**
        *   `definition`: `(self: ActorHandle<T>, helpers: { outbox: ActorHandle<T>, complete: () => ActorCommand<T>, fail: (error: Error) => ActorCommand<unknown> }) => ActorCommand<T>`
            A callback function invoked to build the actor's behavior. It receives two arguments:
            *   `self: ActorHandle<T>`: An `ActorHandle` representing the actor itself.
            *   `helpers`: An object containing essential helper utilities: `outbox`, `complete`, `fail`.
                *   `outbox: ActorHandle<T>`: Handle for the actor receiving messages from this actor definition.
                *   **`complete(): ActorCommand<T>`**: Command to terminate the actor normally.
                *   **`fail(error: Error): ActorCommand<unknown>`**: Command to terminate the actor with an error.
    *   **Return Value:** `ActorDefinition<T>`: An opaque definition object.
    *   **Example (Overall Structure):**
        ```typescript
        interface MyMessage { type: "PING" | "PONG" | "INIT_DATA"; payload?: any; }
        interface MyState { initialized: boolean; data?: any; }

        const myActorDefinition = act<MyMessage>((self, { outbox, complete, fail }) =>
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

### Command combinators

*   **`send<T>(target: ActorHandle<T>, message: T | StateValueResolver<T>) -> ActorCommand<T, HandlerAction<T>>`**
    *   **Description:** Immediately yields the specified message (or a message resolved from state) from the actor's iterator. The message is automatically wrapped in a `HandlerAction.Send(target, message)` internally.
    *   **Type Parameters:**
        *   `T`: The union type of messages that the `target` actor can receive.
    *   **Parameters:**
        *   `target: ActorHandle<T>`: The handle of the actor to send the message to.
        *   `message: T | StateValueResolver<T>`: The message to send, or a `StateValueResolver` that will produce the message.
    *   **Return Value:** `ActorCommand<T, HandlerAction<T>>`: A command that, when executed, will send the message.
    *   **Behavior:** If `message` is a `StateValueResolver`, it's resolved using the relevant state. The actor then yields `[HandlerAction.Send(target, resolvedMessage)]`. Execution continues immediately.
    *   **Example:**
        ```typescript
        // Literal message
        send(outbox, { type: "DATA", value: 42 })
        
        // Message from state
        withState(() => ({ id: "123" }), idHandle => 
          send(outbox, readState(idHandle, s => ({ type: "USER_ID", id: s.id })))
        )
        ```

*   **`kill<T>(target: ActorHandle<T>) -> ActorCommand<unknown>`**
    *   **Description:** Immediately yields a `HandlerAction.Kill` for the specified `target` actor handle.
    *   **Type Parameters:**
        *   `T`: The message type of the actor being killed. This is often `unknown` if the specific message type isn't relevant to the kill operation itself.
    *   **Parameters:**
        *   `target: ActorHandle<T>`: The handle of the actor to kill.
    *   **Return Value:** `ActorCommand<unknown>`: A command that, when executed, will kill the target actor.
    *   **Behavior:** The actor's underlying async generator yields `[HandlerAction.Kill(target)]`.
    *   **Example:**
        ```typescript
        actions(() => [
          send(outbox, { type: 'INITIALIZING' }),
          delay(50),
          kill(self), 
          send(outbox, { type: 'THIS_WONT_RUN' }) 
        ])
        ```

*   **`waitFor<T, TNarrowed extends T>(predicate: ((message: T) => message is TNarrowed) | StateValueResolver<((message: T) => message is TNarrowed)>, commandIfTrue?: (messageHandle: StateHandle<TNarrowed>) => ActorCommand<T>) -> ActorCommand<T>`**
    *   **Description:** Pauses actor execution until an incoming message satisfies the `predicate`. If a `commandIfTrue` is provided, it's invoked with a `StateHandle` for the consumed message (type-narrowed). The factory returns a command to be executed. To access message fields within the factory, use `readState(messageHandle, msg => ...)`. The `messageHandle` is temporary and valid only within the `commandIfTrue` callback.
    *   **Type Parameters:**
        *   `T`: The general union type of messages the actor can receive.
        *   `TNarrowed extends T`: A narrowed subtype of `T`, used when the `predicate` acts as a type guard.
    *   **Parameters:**
        *   `predicate: ((message: T) => message is TNarrowed) | StateValueResolver<((message: T) => message is TNarrowed)>`: A function or a `StateValueResolver` for a function that evaluates an incoming message. If it's a type guard, `TNarrowed` will be the type of the message if the predicate returns `true`.
        *   `commandIfTrue?: (messageHandle: StateHandle<TNarrowed>) => ActorCommand<T>`: An optional factory function called if the `predicate` returns `true`. It receives a `StateHandle` for the consumed (and potentially type-narrowed) message and must return an `ActorCommand` to be executed.
    *   **Return Value:** `ActorCommand<T>`: A command that, when executed, will wait for and process a message according to the predicate.
    *   **Behavior:**
        1.  Actor execution pauses. If `predicate` is a `StateValueResolver`, it's resolved.
        2.  On message arrival, evaluate `resolvedPredicate(message)`.
        3.  If `true`, calls `commandIfTrue(messageHandle)` and executes the returned command.
        4.  If `false`, the command is not executed, and the actor continues to the next instruction.
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

*   **`delay<T>(durationMs: number | StateValueResolver<number>) -> ActorCommand<T>`**
    *   **Description:** Pauses execution for the specified duration. This duration can be a literal `number` (in milliseconds) or a `StateValueResolver<number>` to dynamically determine the delay from state at runtime.
    *   **Type Parameters:**
        *   `T`: The message type of the actor definition. This is used for consistency with other commands but doesn't directly affect the `delay` operation itself.
    *   **Parameters:**
        *   `durationMs: number | StateValueResolver<number>`: The duration to wait in milliseconds, or a `StateValueResolver` that will produce this duration.
    *   **Return Value:** `ActorCommand<T>`: A command that, when executed, will pause the actor for the specified duration.
    *   **Behavior:** If `durationMs` is a `StateValueResolver`, it's resolved. The actor then waits for the resolved duration. Commands in a sequence are executed sequentially; for instance, a `delay` command will fully complete before any subsequent command (like `waitFor` or `when`) begins execution. Messages arriving from external sources while a `delay` (or any other non-message-consuming command) is active are typically buffered by the underlying actor system and will be processed by the next relevant message-consuming command (e.g., `waitFor`, `when`) once it becomes active.
    *   **Example:**
        ```typescript
        // Literal duration
        delay(100)
        
        // Duration from state
        withState(() => ({ waitTime: 200 }), timeHandle => 
          delay(readState(timeHandle, s => s.waitTime))
        )
        ```

*   **`none<T>() -> ActorCommand<T>`**
    *   **Description:** A no-operation command.
    *   **Type Parameters:**
        *   `T`: The message type of the actor definition, for command type consistency.
    *   **Parameters:** None.
    *   **Return Value:** `ActorCommand<T>`: A command that performs no action when executed.
    *   **Behavior:** The runner skips this command.
    *   **Example:**
        ```typescript
        whenState(
          readState(someHandle, s => s.shouldIgnore),
          none(), // Do nothing if condition is true
          send(outbox, { type: 'PROCESS' })
        )
        ```

*   **`actions<T>(commands: (controls: { done: () => ActorCommand<T> }) => Array<ActorCommand<T>>)`**
    *   **Description:** Executes a sequence of commands. The factory function receives `controls.done()` which can be called to terminate the current `actions` block early.
    *   **Type Parameters:**
        *   `T`: The message type of the actor definition, for command type consistency within the sequence.
    *   **Parameters:**
        *   `commands: (controls: { done: () => ActorCommand<T> }) => Array<ActorCommand<T>>`: A factory function that returns an array of `ActorCommand<T>` to be executed in sequence. It receives a `controls` object with a `done` function that can be called to exit the sequence prematurely.
    *   **Return Value:** `ActorCommand<T>`: A command that, when executed, will run the sequence of provided commands.
    *   **Behavior:** Executes commands in the provided order. If `controls.done()` is called, execution of the current `actions` block halts, and control passes to the command following the `actions` block. If `done()` is not called, the sequence completes after the last command in the array, and then control proceeds.
    *   **Example:** (See various examples throughout)

*   **`withState<S, T>(initialState: () => S | StateValueResolver<() => S>, factory: (stateHandle: StateHandle<S>) => ActorCommand<T>)`**
    *   **Description:** Defines a stateful command scope. It creates an initial state and provides a `stateHandle` to the `factory` function. The `factory` returns a command that operates within this state scope.
    *   **Type Parameters:**
        *   `S`: The type of the state being managed within this scope.
        *   `T`: The message type of the actor definition, for command type consistency of the command returned by the `factory`.
    *   **Parameters:**
        *   `initialState: () => S | StateValueResolver<() => S>`: A function that returns the initial state value, or a `StateValueResolver` for such a function. This function is invoked to establish the initial state for this scope.
        *   `factory: (stateHandle: StateHandle<S>) => ActorCommand<T>`: A factory function that receives a `StateHandle<S>` for the newly created state and must return an `ActorCommand<T>` that will operate within this state's context.
    *   **Return Value:** `ActorCommand<T>`: A command that, when executed, establishes a state scope and runs the command returned by the `factory`.
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

*   **`modifyState<S, T>(stateHandle: StateHandle<S>, updater: (currentState: S) => S) -> ActorCommand<T>`**
    *   **Description:** Synchronously updates the state associated with `stateHandle`.
    *   **Type Parameters:**
        *   `S`: The type of the state being modified.
        *   `T`: The message type of the actor definition, for command type consistency. It does not directly affect the state modification itself.
    *   **Parameters:**
        *   `stateHandle: StateHandle<S>`: The handle to the state that needs to be updated.
        *   `updater: (currentState: S) => S`: A function that takes the current state `S` and returns the new state `S`.
    *   **Return Value:** `ActorCommand<T>`: A command that, when executed, will update the specified state.
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
    *   **Type Parameters:**
        *   `S`: The type of the state being read from.
        *   `V`: The type of the value selected from the state.
    *   **Parameters:**
        *   `stateHandle: StateHandle<S>`: The handle to the state from which to read.
        *   `selector: (currentState: S) => V`: A function that takes the current state `S` and returns a selected value `V`.
    *   **Return Value:** `StateValueResolver<V>`: An opaque resolver object that, when used by a command, will provide the value selected from the state at the time of resolution.
    *   **Behavior:** Returns an opaque `StateValueResolver` object containing the `stateHandle` and the `selector`. The command execution engine uses this to fetch the actual value from state when needed.
    *   **Example:**
        ```typescript
        // Used with send:
        send(outbox, readState(dataHandle, s => ({ type: "CURRENT_DATA", payload: s.info })));

        // Used with delay:
        delay(readState(configHandle, s => s.timeoutMs));
        ```

*   **`computeState<S extends unknown[], V>(handles: Readonly<{[K in keyof S]: StateHandle<S[K]>}>, computer: (...values: S) => R): StateValueResolver<R>`**
    *   **Description:** Creates a `StateValueResolver` for a derived value `R`. It takes a tuple of `StateHandle`s and a `computer` function.
    *   **Type Parameters:**
        *   `S`: A tuple type representing the types of the states managed by the input `handles` (e.g., `[StateType1, StateType2]`).
        *   `V`: The type of the value returned by the `computer` function. *Note: The original signature uses `R` for the return type of `computer` and the `StateValueResolver`. This will be updated to `V` for consistency if `R` was a typo, or clarified if `R` is distinct.* Assuming `R` is the intended return type.
        *   `R`: The type of the value returned by the `computer` function and consequently the type of the resolved value.
    *   **Parameters:**
        *   `handles: Readonly<{[K in keyof S]: StateHandle<S[K]>}>`: A read-only array (tuple) of `StateHandle`s. Each handle corresponds to a state that will be an input to the `computer` function.
        *   `computer: (...values: S) => R`: A function that takes the resolved values of the states (in the same order as the `handles` array) and returns a computed value `R`.
    *   **Return Value:** `StateValueResolver<R>`: An opaque resolver object that, when used by a command, will provide the computed value `R` at the time of resolution.
    *   **Behavior:** When resolved by the interpreter:
        1.  Each `StateHandle` in `handles` is resolved to its current state value.
        2.  The `computer` function is called with these resolved state values in the same order as the handles.
        3.  The return value of `computer` is the result of this `computeState` operation, wrapped as a `StateValueResolver`.
    *   **Example:**
        ```typescript
        const greetingResolver = computeState(
          [appStateHandle, userPrefsHandle],
          (appState, userPrefs) => 
            `Hello, ${appState.name}! Your lang is ${userPrefs.preferredLang} on theme ${appState.settings.theme}.`
        );
        ```

*   **`whenState<T>(predicateResolver: StateValueResolver<boolean>, commandIfTrue: ActorCommand<T>, commandIfFalse?: ActorCommand<T>): ActorCommand<T>`**
    *   **Description:** Conditionally executes a command based on a `StateValueResolver<boolean>`. The `predicateResolver` is typically created using `readState` (for single state dependency) or `computeState` (for multiple state dependencies).
    *   **Type Parameters:**
        *   `T`: The message type of the actor definition, for command type consistency of the conditional commands.
    *   **Parameters:**
        *   `predicateResolver: StateValueResolver<boolean>`: A `StateValueResolver` that resolves to a boolean value. This determines which command branch is executed.
        *   `commandIfTrue: ActorCommand<T>`: The command to execute if the `predicateResolver` resolves to `true`.
        *   `commandIfFalse?: ActorCommand<T>`: An optional command to execute if the `predicateResolver` resolves to `false`.
    *   **Return Value:** `ActorCommand<T>`: A command that, when executed, will conditionally run one of the provided commands based on resolved state.
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

*   **`when<T, TNarrowed extends T>(predicate: ((message: T) => message is TNarrowed) | StateValueResolver<((message: T) => message is TNarrowed)>, commandIfTrue: (messageHandle: StateHandle<TNarrowed>) => ActorCommand<T>, commandIfFalse?: (messageHandle: StateHandle<T>) => ActorCommand<T>): ActorCommand<T>`**
    *   **Description:** Waits for the next incoming message from the actor's inbox, consumes it, and then conditionally executes a command returned by one of two factories based on the `predicate`. This command *always* consumes one message upon invocation, regardless of whether its predicate is state-based or directly uses the message content. The factories receive a `StateHandle<T>` for the incoming message (type-narrowed to `TNarrowed` for `commandIfTrue` if the predicate is a type guard), allowing message fields to be accessed via `readState(messageHandle, ...)`. This `messageHandle` is temporary and valid only within its respective factory callback (`commandIfTrue` or `commandIfFalse`).
    *   **Type Parameters:**
        *   `T`: The general union type of messages the actor can receive.
        *   `TNarrowed extends T`: A narrowed subtype of `T`, used when the `predicate` acts as a type guard.
    *   **Parameters:**
        *   `predicate: ((message: T) => message is TNarrowed) | StateValueResolver<((message: T) => message is TNarrowed)>`: A function (often a type guard) or a `StateValueResolver` for a function that evaluates the incoming message.
        *   `commandIfTrue: (messageHandle: StateHandle<TNarrowed>) => ActorCommand<T>`: A factory function called if the `predicate` returns `true`. It receives a `StateHandle` for the consumed (and type-narrowed) message and must return an `ActorCommand` to be executed.
        *   `commandIfFalse?: (messageHandle: StateHandle<T>) => ActorCommand<T>`: An optional factory function called if the `predicate` returns `false`. It receives a `StateHandle` for the consumed message (not narrowed) and must return an `ActorCommand` to be executed.
    *   **Return Value:** `ActorCommand<T>`: A command that, when executed, will consume a message and conditionally execute further commands based on that message.
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

*   **`whileLoop<T>(factory: (commands: { break: () => ActorCommand<T>, continue: () => ActorCommand<T> }) => ActorCommand<T>) -> ActorCommand<T>`**
    *   **Description:** Creates a command that repeatedly executes a body command sequence provided by the `factory` function. Loop control (`break`, `continue`) is explicit via the `commands` object passed to the factory. State-dependent logic within the loop body should use `whenState` or `readState` with a lexically captured `StateHandle`.
    *   **Type Parameters:**
        *   `T`: The message type of the actor definition, for command type consistency of the commands within the loop and the loop control commands.
    *   **Parameters:**
        *   `factory: (commands: { break: () => ActorCommand<T>, continue: () => ActorCommand<T> }) => ActorCommand<T>`: A factory function that is called at the beginning of each loop iteration. It receives a `commands` object with `break` and `continue` functions (which return commands to control the loop) and must return an `ActorCommand<T>` representing the body of the loop for that iteration.
    *   **Return Value:** `ActorCommand<T>`: A command that, when executed, will run the loop.
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