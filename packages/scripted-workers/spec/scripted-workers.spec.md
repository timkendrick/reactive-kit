## Scripted Workers Toolkit

The Scripted Workers Toolkit provides a declarative API for defining the behavior of ReactiveKit actors, allowing precise control over timing and message sequences.

### 2.1 Basic Actions

```typescript
// Basic send action
act((self, { outbox }) => send(outbox, { type: "READY" }))

// Complete task
act((self, { complete }) => complete())

// Fail with error
act((self, { fail }) => fail(new Error("Task failed")))

// Wait for specific message
act((self, { outbox }) => sequence(() => [
  waitFor((msg): msg is Extract<MyMessage, { type: "START" }> => msg.type === "START",
    (msgHandle) => send(outbox, readState(msgHandle, (startMsg) => ({ type: "ACK_START", payload: startMsg.payload })))
  ),
  send(outbox, { type: "READY" })
]))

// Delay execution
act((self, { outbox }) => sequence(() => [
  delay(100), // ms
  send(outbox, { type: "READY" })
]))

// Combined basic actions
act((self, { outbox }) => sequence(() => [
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
  withState(() => ({ progress: 0 }), stateHandle => sequence(() => [
    // Update state
    modifyState(stateHandle, s => ({ progress: s.progress + 0.1 })),
    
    // Emit based on state using readState
    send(outbox, readState(stateHandle, s => ({ type: "PROGRESS", value: s.progress })))
  ]))
)

// State-based retry logic using computeState and readState
act((self, { outbox }) => 
  withState(() => ({ retries: 0 }), stateHandle => sequence(() => [
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
    sequence(() => [
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
            sequence(() => [
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
    sequence<MyMessage>(() => [
      whileLoop((loop) =>
        sequence(() => [
          // Conditional break or continue based on state
          whenState(
            readState(stateHandle, s => s.count >= 3),
            loop.break(), // If count >= 3, break
            sequence(() => [ // Else, continue loop actions
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

Worker definitions are created using the `act` factory function. This function provides a context and helper utilities to configure the worker's behavior declaratively using the command combinators.

### Worker state and runtime values

Scripted workers can define internal state.

A `StateHandle<S>` is an opaque handle to a state of type `S`. 
    *   When created by `withState`, the `stateHandle` is valid for all lexically nested commands within that `withState` block and its factory function.
    *   When provided to a factory by commands like `waitFor` or `when` (representing a consumed message), this `messageHandle` is a temporary handle valid only within the scope of that specific factory function callback.

Many command parameters can accept either a direct, static value (e.g., a `number` for a duration) or a dynamic `ValueRef<V>` that resolves to a value at runtime.

These dynamic resolvers can be direct state references (`StateRef<V>`), derived from a single state (`ReadStateValueResolver<S,V>`), computed from multiple states (`ComputeStateValueResolver<S[],V>`), or references to spawned actors (`SpawnedActorResolver<T>`).

Dynamic runtime values can be used interchangeably with static values wherever a `ValueRef<V>` is present in a type signature.

### Internal Architecture

The `act()` function, when invoked with a worker definition, doesn't directly execute the described behavior. Instead, it compiles the scripted worker definition into a sequence of virtual machine (VM) instructions. This sequence is then internally executed by a lightweight, stack-based interpreter. The worker created by `act()` is a **synchronous actor**. Its `handle(message, context)` method drives the VM's execution.

#### 1. VM Architecture overview

The core components of the internal VM are:

*   **Instruction Queue:** A list of VM instructions derived from the user's `ActorCommand` definitions. The `act` function effectively translates the command tree into a linear sequence of these instructions.
*   **Execution Stack (VM Stack):** A runtime stack used to manage control flow (including block and loop contexts), store intermediate values, and manage lexically-scoped state. `StateHandle`s created by `withState` refer to data held within specific frames on this stack. It is distinct from any JavaScript call stack.
*   **Instruction Pointer (IP):** A pointer that indicates the next VM instruction to be fetched and executed from the Instruction Queue.
*   **Execution Engine (Internal to VM):** A central loop within the VM's generator function that fetches the instruction at the current IP, decodes it, and dispatches it to the appropriate handler logic. This engine also manages interactions with the actor system for message passing and timers *by yielding command descriptors to the synchronous actor's `handle` method*.

When a worker definition begins execution (typically when the synchronous `act` worker receives its first message or during its initialization), the `ActorDefinition` (the output of `act(...)`) is processed. The VM is initialized with the instruction sequence, an empty stack (for block, loop, and state contexts), and its IP set to the start of the sequence. The `handle()` method of the synchronous worker then calls the VM's interpreter (e.g., `interpreter.next()`). The VM's execution engine runs until a terminal instruction (like `complete` or `fail`) is encountered, an instruction requiring external asynchronous action (like `delay` or `spawn`) is yielded, or until the VM needs to pause to `await_message`.

**Managing Asynchronous Operations:**
Operations like `delay` or awaiting specific messages (`waitFor`, `when`) involve pausing the VM's execution.
*   For `delay`: The VM yields a `DELAY` command descriptor. The synchronous actor's `handle` method then uses `context.spawn()` to create a short-lived asynchronous child "timer" actor. This timer actor waits for the specified duration and sends a "delay complete" message back to the parent (the main scripted worker). The parent worker, upon receiving this message, resumes its VM.
*   For `waitFor` (or `when`): The VM yields an `AWAIT_MESSAGE` command descriptor. The synchronous actor's `handle` method then pauses the VM. When a new message arrives that the worker's `handle` method processes, it will resume the VM, passing the message content for the VM to evaluate against its predicate.
*   For `spawn`: The VM yields a `SPAWN` command descriptor containing the child actor factory. The synchronous worker's `handle` method uses `context.spawn()` to create the child and then resumes the VM, passing the new child's `ActorHandle` back into the VM.

The synchronous worker is responsible for storing and restoring the VM's state (the generator instance) when it's paused and resumed.

#### 2. VM Instruction Set

The declarative commands provided in a worker definition (e.g., `send`, `waitFor`, `withState`) are compiled into a lower-level VM instruction set. Each instruction is a simple operation that the VM's execution engine can process. The translation from the high-level API to VM instructions aims to flatten the nested structure of commands into a linear sequence where possible, with structured control flow instructions managing block and loop exits and continuations.

The instruction set can be broadly categorized:

*   **Core Task Operations:**
    *   `ACTOR_SEND`: Corresponds to `send()`. Takes a target actor handle and a message (or a resolver for a message) as operands.
    *   `TASK_COMPLETE`: Corresponds to `helpers.complete()`. Terminates the task successfully.
    *   `TASK_FAIL`: Corresponds to `helpers.fail()`. Terminates the task with an error.
    *   `ACTOR_KILL`: Corresponds to `kill()`. Takes a target actor handle.
    *   `NOOP`: Corresponds to `noop()`.

*   **Control Flow Operations:**
    *   **`BLOCK_ENTER_AWAIT`**: Pauses execution to await an incoming message. Upon message receipt, it makes the message available as a temporary, scoped state.
        *   **Operand:** `length: number`. This defines the scope/lifetime of the temporary message state.
        *   **Behavior:**
            1.  Yields a command descriptor (e.g., `{ type: 'AWAIT_MESSAGE' }`) to the external runner and pauses VM execution.
            2.  When the runner resumes the VM with a received message `M`:
                a.  The VM pushes message `M` onto its stack.
                b.  The VM pushes a new "temporary message block context" onto the stack. This context is associated with message `M`, stores the provided `length`, and makes an implicit `StateHandle<typeof M>` available.
                c.  Execution continues with the next instruction. The message `M` (via its `StateHandle`) is accessible to instructions within the defined `length` of this block.
            3.  The compiler MUST ensure that the last instruction within this `length` is a `BLOCK_BREAK` that terminates this temporary message block. When this `BLOCK_BREAK` is executed, both the temporary message block context and the message `M` itself are popped from the stack. Note that a terminating `BLOCK_BREAK` instruction with a `blockIndex` greater than `0` is allowed; this will additionally terminate the corresponding number of parent blocks.
        *   **Compiler Note for `when()` and `waitFor()` predicates:**
            *   **`when(msg_predicate, ...)`:**
                *   A `BLOCK_ENTER_AWAIT { length: L_scope }` is emitted first. `L_scope` covers all instructions for the `when` command.
                *   The `msg_predicate` (and any type guard) is compiled into a resolver referencing the message `StateHandle` from `BLOCK_ENTER_AWAIT`.
                *   This resolver is used in conditional logic (e.g., `BLOCK_BREAK_IF`) to direct flow to the `thenCmd` or `elseCmd` branches.
                *   The message `StateHandle` is exposed to the output of the respective command factories.
            *   **`waitFor(msg_predicate, ...)`:**
                *   `waitFor` is compiled into an explicit loop structure to repeatedly await messages until the `msg_predicate` is met.
                *   The general structure is:
                    1.  `LOOP_ENTER { length: L_waitFor_loop }` - This instruction initiates the waiting loop.
                    2.    `BLOCK_ENTER_AWAIT { length: L_message_scope }` - Inside the loop, this instruction pauses execution to await an incoming message. When a message `M` arrives, it's made available via an implicit `StateHandle`.
                    3.    A conditional block structure follows, using the `msg_predicate` (resolved against message `M`):
                        *   If `msg_predicate(M)` is `false`: Instructions are executed (e.g., `LOOP_CONTINUE { loopIndex: 0 }`) to discard message `M` (by allowing `L_message_scope` to terminate) and continue the `L_waitFor_loop`, effectively going back to step 2 to await the next message.
                        *   If `msg_predicate(M)` is `true`:
                            *   The compiled instructions for `commandIfTrue` (if any) are executed. The `StateHandle` for message `M` is exposed to the output of the `commandIfTrue` factory if provided.
                            *   A `LOOP_EXIT { loopIndex: 0 }` instruction is executed to terminate the `L_waitFor_loop`.
                    4.  The compiler ensures proper block termination (e.g., `BLOCK_BREAK` for `L_message_scope`) within the loop's structure.
                *   This explicit loop compiled from `waitFor` ensures that message consumption and predicate checking repeat until a match.
    *   `DELAY`: Corresponds to `delay()`. Pauses execution. Takes a duration (or a resolver for it).
    *   `BLOCK_ENTER`: Marks the beginning of a generic block (e.g., for `sequence`, or conditional branches of `whenState`/`when`, or the implicit block around `withState` or `whileLoop` bodies). Pushes a new block context onto the VM stack.
        *   **Operand:** `length: number`. The total number of VM instructions contained within this block, *excluding* the `BLOCK_ENTER` instruction itself. This length allows the VM and compiler to determine the block's boundaries.
        *   The compiler MUST ensure that the last instruction within this `length` is a `BLOCK_BREAK` that terminates the current block. This `BLOCK_BREAK` handles the explicit or implicit termination of the block scope. Note that a terminating `BLOCK_BREAK` instruction with a `blockIndex` greater than `0` is allowed; this will additionally terminate the corresponding number of parent blocks.
    *   `BLOCK_ENTER_STATE`: Marks the beginning of a block that declares a local state value (e.g. `withState`). Pushes a new block context onto the VM stack.
        *   **Operands:** `initialStateResolver: ValueRef<() => S>`, `length: number`.
        *   **Behavior:**
            1.  Evaluates `initialStateResolver` to get the initial state value.
            2.  Pushes this state value onto the VM stack.
            3.  Pushes a new "stateful block context" onto the VM stack. This context is associated with the pushed state and stores its `length`.
        *   The `length` is the total number of VM instructions within this stateful block, *excluding* the `BLOCK_ENTER_STATE` instruction itself. The state is active for the duration of this block. The compiler MUST ensure that the last instruction within this `length` is a `BLOCK_BREAK` that terminates the current stateful block. This `BLOCK_BREAK` handles the explicit or implicit termination of the block scope. Note that a terminating `BLOCK_BREAK` instruction with a `blockIndex` greater than `0` is allowed; this will additionally terminate the corresponding number of parent blocks.
    *   `BLOCK_BREAK`: Exits an enclosing block
        *   **Operand:** `blockIndex: number`. `0` for the innermost active block, `1` for the next outer, etc.
        *   **Behavior:** Unconditionally transfers control flow to the instruction immediately following the conceptual end of the block identified by `blockIndex`. It is used for explicit exits (e.g., `sequence().controls.done()`) and is also MANDATORILY inserted by the compiler as the final instruction within a `BLOCK_ENTER`, `BLOCK_ENTER_STATE` or `BLOCK_ENTER_AWAIT` block's defined `length` to handle implicit block termination. The `blockIndex` refers to any active scope context on the stack, including those established by `BLOCK_ENTER...` instructions (generic blocks, stateful blocks, message blocks) and `LOOP_ENTER` instructions (loop blocks). When `BLOCK_BREAK` is executed, all intervening scope contexts up to and including the target scope at `blockIndex` are popped from the VM's context stack, and any associated values (from stateful or message blocks) are popped from the value stack.
    *   `BLOCK_BREAK_IF`: Conditionally exits an enclosing block
        *   **Operands:** `predicate: ValueRef<boolean>`, `blockIndex: number`.
        *   **Behavior:** If the resolved `predicate` is true, behaves like `BLOCK_BREAK { blockIndex }`. Otherwise, execution continues sequentially. Used to compile conditional branches of `whenState()` and message-based conditional breaks like in `when()`.
    *   **`LOOP_ENTER`**: Marks the beginning of a `whileLoop()` block. Pushes a new loop context onto the VM stack.
        *   **Operands:** `length: number`.
        *   **Behavior:** Pushes a new loop context onto the VM stack. This context includes the starting IP of the loop's body (for `LOOP_CONTINUE` purposes), the `length` of the loop (for `LOOP_EXIT`), and is used by `LOOP_EXIT` and `LOOP_CONTINUE` to identify the target loop.
        *   The `length` is the total number of VM instructions contained within this loop, *excluding* the `LOOP_ENTER` instruction itself. The compiler MUST ensure that the last instruction within this `length` is a `LOOP_CONTINUE` for the current loop, which handles implicit loop repetition. The `length` allows the VM to determine the loop's boundaries for `LOOP_EXIT` purposes.
    *   **`LOOP_EXIT`**: Unconditionally exits an enclosing loop.
        *   **Operand:** `loopIndex: number` (`0` for innermost loop, etc.).
        *   **Behavior:** Unconditionally terminates the loop identified by `loopIndex`. The VM uses the `length` stored in the target `LoopContext` (and the original IP where `LOOP_ENTER` was executed) to calculate the jump target, which is the instruction immediately following the conceptual end of that loop. Corresponds to `whileLoop().controls.break()`.
    *   **`LOOP_CONTINUE`** (Revised):
        *   **Operand:** `loopIndex: number` (`0` for innermost loop, etc.).
        *   **Behavior:** Transfers control to the beginning of the body of the loop identified by `loopIndex`. Used for `whileLoop().controls.continue()`. It is also ALWAYS inserted by the compiler as the final instruction within a `LOOP_ENTER` block's defined `length` to handle implicit loop repetition.
            If `loopIndex` targets an outer loop (i.e., `loopIndex > 0`), before transferring control, the VM MUST first unwind all intervening scope contexts (i.e., any `BlockContext` or inner `LoopContext` frames on the context stack between the current execution point and the target `LoopContext`). This unwinding process involves popping these intervening frames from the context stack and, for any `BlockContext` associated with a value (from `BLOCK_ENTER_STATE` or `BLOCK_ENTER_AWAIT`), popping the corresponding value from the value stack. This ensures that when the target outer loop continues, the VM stack is consistent with the lexical scope of that loop's body.

*   **State Management Operations:**
    *   `STATE_UPDATE`: Corresponds to `modifyState()`. Takes a state handle (resolved from the stack) and an updater function.
    *   *Note: `readState` and `computeState` don't necessarily translate to dedicated VM instructions. Instead, their results (which are specific types of `ValueRef<V>`) are operands to other instructions (like `ACTOR_SEND`, `BLOCK_BREAK_IF`, `DELAY`). The VM resolves these dynamic `ValueRef<V>` instances at the point the consuming instruction is executed.*

*   **Operand Types:** VM instructions operate on two main kinds of inputs: *Immediates* and *Operands (Values)*.
    *   **Immediates:** These are values directly encoded with the instruction.
        *   Example: `blockIndex` or `loopIndex` values used by structured control flow instructions.
    *   **Operands (Values):** These represent data that instructions act upon. They are all encompassed by the `ValueRef<V>` abstraction, which allows commands to interchangeably use static values or values that are dynamically resolved at runtime. Operands can be further categorized:
        *   **Static Operands:** Values known at compile time or directly available without further resolution by the VM from its internal state.
            *   Literal values (e.g., numbers, strings, booleans).
            *   `ActorHandle`s (direct references to other actors).
        *   **Dynamic Operands (Runtime Value Resolvers):** Values that are resolved or computed by the VM at runtime, often involving access to the VM's execution stack or state. These are specific variants of `ValueRef<V>`:
            *   `StateRef<V>`: An opaque handle that directly references a piece of state managed on the VM's execution stack.
            *   `ReadStateValueResolver<S, V>`: Created by the `readState` helper, this resolves a value by applying a selector function to a single `StateRef<S>`.
            *   `ComputeStateValueResolver<S[], V>`: Created by the `computeState` helper, this resolves a value by applying a computer function to an array of `StateRef<S>` instances.
            *   `SpawnedActorResolver<T>`: A specialized `ValueRef<ActorHandle<T>>` created by the `spawn` command. It resolves to the `ActorHandle<T>` of a newly spawned child actor.

This instruction set allows the VM to interpret complex worker definitions by breaking them down into manageable, sequential steps with explicit, structured control flow. The compilation process (from `ActorCommand` tree to linear VM instructions) is a key part of `act()`'s internal setup.

##### 2.1. Conditional Logic

Conditional commands like `whenState(predicate, { then: thenCmd, else: elseCmd })` (and similarly, `when()`) are compiled into a sequence of block operations to manage distinct execution paths. The compilation strategy ensures a consistent structure for both cases where an 'else' branch is present and where it is absent.

The general compilation pattern is as follows:

*   `BLOCK_ENTER`: The main conditional block.
    *   `BLOCK_ENTER`: Nested block for the 'else' path.
        *   `BLOCK_BREAK_IF { blockIndex: 0 }` - Predicate check; conditionally exits the 'else' block.
        *   *Else path instructions*
        *   `BLOCK_BREAK { blockIndex: 1 }` - Exit the main conditional block.
    *   *Then path instructions*
    *   `BLOCK_BREAK { blockIndex: 0 }` - Exit the main conditional block.

In more detail:

*   **`BLOCK_ENTER B_CONDITIONAL { length: L_total }`**: The main conditional block.
    *   `L_total` encompasses all instructions from `B_ELSE`'s `BLOCK_ENTER` to `B_CONDITIONAL`'s own final `BLOCK_BREAK`.
    *   The VM stack now includes `Context_Conditional`.
    *   Instruction Pointer (IP) advances.

    *   **`BLOCK_ENTER B_ELSE { length: L_else }`**: The block for the 'else' path. This block is *always* generated.
        *   If `elseCmd` is provided: `L_else` covers the compiled instructions for `elseCmd` plus its terminating `BLOCK_BREAK`.
        *   If no `elseCmd` is provided: `L_else` covers a single `BLOCK_BREAK` instruction that targets `B_CONDITIONAL`.
        *   The VM stack now includes `Context_Else` (innermost, `blockIndex: 0`), on top of `Context_Conditional` (`blockIndex: 1`).
        *   IP advances.

    *   **`BLOCK_BREAK_IF { predicate: P_original, blockIndex: 0 }`**: Predicate check.
        *   `P_original` is the *original* predicate from `whenState` or `when`.
        *   `blockIndex: 0` targets `B_ELSE`.
        *   IP advances past this instruction.
        *   **If `P_original` resolves to `true`**:
            *   `B_ELSE` is broken. `Context_Else` is popped from the VM stack.
            *   IP jumps to the instruction immediately following the conceptual end of `B_ELSE` (i.e., to the start of the 'Then' Path Instructions).
        *   **If `P_original` resolves to `false`**:
            *   Execution continues sequentially into the body of `B_ELSE`.

    *   **Else Path Instructions (Body of `B_ELSE`)**:
        *   These are executed only if `P_original` was `false`.
        *   **If `elseCmd` was provided**:
            *   The compiled instructions for `elseCmd` are executed here.
            *   These instructions must be followed by:
            *   `BLOCK_BREAK { blockIndex: 1 }` (targets `B_CONDITIONAL`). `Context_Conditional` and `Context_Else` are popped. IP jumps past `B_CONDITIONAL`.
        *   **If no `elseCmd` was provided**:
            *   This path contains a single instruction:
            *   `BLOCK_BREAK { blockIndex: 1 }` (targets `B_CONDITIONAL`). `Context_Conditional` and `Context_Else` are popped. IP jumps past `B_CONDITIONAL`.
        *   IP advances through these instructions.

    *   **Then Path Instructions**:
        *   These are executed only if `P_original` was `true` (due to the jump from `BLOCK_BREAK_IF`).
        *   The compiled instructions for `thenCmd` are executed here.
        *   These instructions must be followed by (often compiler-inserted if `thenCmd` doesn't naturally end with a compatible break):
        *   `BLOCK_BREAK { blockIndex: 0 }` (targets `B_CONDITIONAL`). `Context_Conditional` is popped. IP jumps past `B_CONDITIONAL`.
        *   IP advances through these instructions.

This structured approach, with `B_ELSE` always present, ensures that:
1.  The predicate `P_original` is always evaluated directly (no inversion needed).
2.  If `P_original` is true, the 'else' path (`B_ELSE`) is skipped, and the 'then' path is executed.
3.  If `P_original` is false, the 'else' path (`B_ELSE`) is executed. If an `elseCmd` was provided, its instructions run; otherwise, the effective "empty else" (a `BLOCK_BREAK` targeting `B_CONDITIONAL`) ensures the 'then' path is skipped.
4.  Control flow correctly exits the main conditional structure (`B_CONDITIONAL`) regardless of which path is taken.

#### 3. VM Stack and State Management

The VM's execution stack is central to its operation, serving not only for structured control flow (managing block and loop contexts) but also for managing the lifecycle of stateful contexts introduced by `withState` and temporary message data.

*   **Stack Frames / Contexts:**
    *   The stack is composed of contexts. A new context is pushed for:
        *   `BLOCK_ENTER`: Pushes a generic block context. The `length` property of the `BLOCK_ENTER` instruction defines the extent of this block. This context is used by `BLOCK_BREAK...` operations to identify their target block. The compiler ensures this block ends with a `BLOCK_BREAK` instruction.
        *   `BLOCK_ENTER_STATE` (from `withState`): Evaluates the initial state, pushes the state value onto the stack, then pushes a "stateful block context". This context is aware of the state it introduced. Its `length` property defines the extent of the stateful block. The compiler ensures this block ends with a `BLOCK_BREAK` instruction.
        *   `BLOCK_ENTER_AWAIT` (from `when`, `waitFor`): After a message is received, pushes the message value onto the stack, then pushes a "temporary message block context". This context is aware of the message it introduced. Its `length` property defines the extent of this temporary message's scope. The compiler ensures this block ends with a `BLOCK_BREAK` instruction.
        *   `LOOP_ENTER`: Pushes a loop context. This context includes information like the starting IP of the loop's body (for `LOOP_CONTINUE` purposes), the `length` of the loop (for `LOOP_EXIT`), and is referenced in the `loopIndex` property of `LOOP_EXIT` and `LOOP_CONTINUE` to identify the target loop. The compiler ensures this loop's body instructions end with a `LOOP_CONTINUE { loopIndex: 0 }`.
    *   Frames hold information such as the defining characteristics of the block or loop (like `BLOCK_ENTER.length` or `LOOP_ENTER.length`), and local data relevant to that scope (like state values or received messages).
    *   Exiting a block (via `BLOCK_BREAK` or `BLOCK_BREAK_IF`) pops its respective context(s) from the stack. When a "stateful block context" (from `BLOCK_ENTER_STATE`) or a "temporary message block context" (from `BLOCK_ENTER_AWAIT`) is popped, the VM also automatically pops the associated state value or message value from the stack. The termination of loops (explicitly via `LOOP_EXIT`) also pops their respective `LoopContext`. Target instruction pointer after block/loop termination is determined using the `length` that was provided in the `BLOCK_ENTER` / `BLOCK_ENTER_STATE` / `BLOCK_ENTER_AWAIT` / `LOOP_ENTER` instruction corresponding to the (outermost) block to be terminated.

*   **State Scopes and `StateHandle` Resolution:**
    *   When a `BLOCK_ENTER_STATE` instruction (generated from `withState`) is executed, the initial state value is computed and stored on the stack. A "stateful block context" is also pushed, linked to this state.
    *   When a `BLOCK_ENTER_AWAIT` instruction is resumed with a message, the message is stored on the stack. A "temporary message block context" is pushed, linked to this message.
    *   A `StateHandle` provided to the user's factory function is, internally, a reference that allows the VM to locate the corresponding state or message data on the stack based on its association with an active stateful or temporary message block context.
    *   `readState` and `computeState` operations, when encountered as operands to other instructions, use these internal `StateHandle` references to access the appropriate data from the relevant contexts on the stack.
    *   State data (from `BLOCK_ENTER_STATE`) or message data (from `BLOCK_ENTER_AWAIT`) is removed from the stack automatically when its respective block context is popped by its terminating `BLOCK_BREAK` instruction. This ensures state and temporary message lifetimes are strictly tied to their lexical scopes.

*   **Temporary Message Handles:**
    *   The `BLOCK_ENTER_AWAIT` instruction is responsible for consuming an incoming message and making it available as a temporary, scoped state on the VM stack.
    *   The VM pushes the message object itself onto the stack and creates an associated "temporary message block context" with a defined `length`.
    *   A `StateHandle` (referred to as `messageHandle` in user-facing factory functions like in `when` or `waitFor`) is implicitly created by the VM for this message. This handle allows `readState` (and by extension, `computeState` if needed) to access the fields of the consumed message.
    *   This `StateHandle` is valid only for the duration of the block defined by `BLOCK_ENTER_AWAIT`'s `length`. The message data is popped from the stack when this scope is exited via its compiler-inserted `BLOCK_BREAK`.
    *   This mechanism ensures that predicates operating on message content (e.g., in `when`) and command factories that need to access message data (e.g., `thenCmd` in `when`, `commandIfTrue` in `waitFor`) can do so using the standard `StateHandle` and `readState` utilities, treating the consumed message as a short-lived piece of state.

*   **Control Flow Resolution (Block and Loop Indices):**
    *   The `blockIndex` and `loopIndex` operands in `BLOCK_BREAK`, `BLOCK_BREAK_IF`, `LOOP_EXIT`, and `LOOP_CONTINUE` are resolved by the VM against the current stack of block and loop contexts. An index of `0` refers to the innermost context of the relevant type (block or loop), `1` to the next one out, and so on. The VM uses this to determine the correct scope to break from, continue, or exit. The `length` property of `BLOCK_ENTER` is crucial for the compiler to correctly calculate jump targets for `BLOCK_BREAK` and for the VM to understand block boundaries for lexical scope.

*   **Dynamic `ValueRef<V>` Resolution:**
    *   Dynamic `ValueRef<V>` accessors (like `StateRef`, `ReadStateValueResolver`, `ComputeStateValueResolver`) can be used as placeholder operands to VM instructions in order to compute the operand value dynamically at runtime.
    *   When an instruction like `ACTOR_SEND` has a dynamic `ValueRef<V>` as its message operand, or `BLOCK_BREAK_IF` has one as its predicate, the VM's execution logic for that instruction is responsible for:
        1.  Identifying the underlying `StateHandle`(s) or other references within the `ValueRef` (this includes `StateHandle`s for regular state from `BLOCK_ENTER_STATE` and temporary message state from `BLOCK_ENTER_AWAIT`).
        2.  Using these handles/references to retrieve the current or derived state/message value(s) from the stack or other dynamic execution environment state (like spawned actor handles).
        3.  Using the final resolved value to proceed with evaluating the instruction (e.g., sending the resolved message, making the break decision).

This tight integration of state management with the stack ensures that state lifetimes are naturally coupled to their lexical scopes, simplifying the VM's design.

#### 4. VM and Runner: Cooperative Execution Model

The execution of a worker definition, created using the `act()` function and its command combinators, is managed by a cooperative interplay between two main components:

1.  **The Virtual Machine (VM):** Implemented as a synchronous generator function. The VM is responsible for interpreting the compiled sequence of instructions derived from the worker definition. It processes instructions related to internal state management, synchronous control flow (like conditional jumps based on state), and preparing descriptors for external actions. When an instruction requires interaction with the outside world (e.g., sending a message, waiting for a delay, or awaiting an incoming message), the VM yields a command descriptor and pauses its execution.

2.  **The Synchronous Worker's `handle` Method (The "Runner"):** The `handle(message, context)` method of the synchronous worker created by `act()` serves as the "runner" for the VM. It initiates the VM (typically on the first relevant message or during actor setup) by calling `interpreter.next()`. It then receives command descriptors `yield`ed by the VM.
    *   Based on these descriptors, the `handle` method performs actions:
        *   For `SEND`, `KILL`: Translates the descriptor into the corresponding `HandlerAction` to be returned by `handle()`. It then typically resumes the VM immediately (`interpreter.next(null)`).
        *   For `SPAWN`: Uses its `context.spawn(factoryFromDescriptor)` to create the child actor. It then resumes the VM by calling `interpreter.next(childActorHandle)`, passing the handle of the newly spawned actor back into the VM.
        *   For `DELAY`: Spawns a short-lived asynchronous timer child task using `context.spawn()`. This timer actor sends a "delay complete" message back to its parent (the worker) after the specified duration. The `handle` method pauses the VM (i.e., does not call `interpreter.next()` in the current invocation for the `DELAY` descriptor). The VM is resumed when the "delay complete" message is processed by a subsequent invocation of `handle()`.
        *   For `AWAIT_MESSAGE`: The `handle` method pauses the VM. When a new message arrives that is relevant to the actor, a subsequent invocation of `handle()` will resume the VM by calling `interpreter.next(receivedMessage)`, passing the received message back into the VM for predicate checking and processing.
        *   For `COMPLETE` or `FAIL`: The `handle` method finalizes the actor's lifecycle, potentially returning a final `HandlerAction.Kill(self)` or propagating an error.
    *   The `handle` method is responsible for storing the VM's generator instance when it's paused and ensuring it's correctly resumed.

This division of labor allows the VM's core logic to remain relatively simple and synchronous (as a generator), focusing on instruction interpretation and state transitions. The synchronous actor's `handle` method manages interactions with the actor system (spawning, sending messages) and orchestrates the pausing and resuming of the VM in response to external events or self-initiated asynchronous operations (like `delay`).

The overall flow is as follows:
*   The `act()` worker's `handle` method is invoked with an initialization message.
*   The handler method initializes the VM by calling `interpreter.next()` to start execution.
*   The VM executes instructions internally until it needs to perform an external action or wait for an event.
*   The VM `yields` a command descriptor to the `handle` method.
*   The `handle` method processes the command:
    *   If the command is synchronous (e.g., `SEND`), it prepares the `HandlerAction`, calls `interpreter.next(null)` to continue VM execution for any further synchronous steps, and eventually returns the collected `HandlerAction`s.
    *   If the command requires pausing (e.g., `DELAY`, `AWAIT_MESSAGE`), the `handle` method sets up the condition for resumption (e.g., spawns a timer, notes it's awaiting a message) and does *not* call `interpreter.next()` in this turn. The VM remains paused.
    *   If the command is `SPAWN`, `handle` uses `context.spawn()` to spawn an actor handle for the new actor, then calls `interpreter.next(newActorHandle)`.
*   This cycle repeats, this time calling `interpreter.next(messagePayloadFromPreviousPause)` to resume the suspended operation. The VM is driven forward by calls to `interpreter.next()` from the `handle` method, either immediately (for synchronous VM steps) or in response to messages that unblock a previously paused state.
*   Eventually, the VM completes its instruction sequence (e.g., by yielding a `COMPLETE` or `FAIL` descriptor, or by the generator function returning).

The following subsections detail the internal workings of the VM's execution cycle and the specific responsibilities of the external runner.

##### 4.1. Internal VM Execution Cycle

The VM generator's core is an internal execution loop that processes instructions from the Instruction Queue. This loop runs synchronously within each invocation of `generator.next()` by the synchronous actor's `handle` method.

*   **The Main Loop:**
    *   The loop continues as long as the Instruction Pointer (IP) is within the bounds of the Instruction Queue and no terminal instruction (like `TASK_COMPLETE` or `TASK_FAIL`) has been executed or yielded.
    *   In each iteration, the engine performs the following steps:
        1.  **Fetch:** Retrieve the instruction located at the current IP from the Instruction Queue.
        2.  **Decode (Implicit):** The instruction's type (e.g., `ACTOR_SEND`, `BLOCK_BREAK_IF`) determines the operation to be performed. Operands are part of the instruction structure.
        3.  **Execute:** Dispatch the instruction to its corresponding handler logic. This is where the primary work of the VM occurs.
        4.  **Advance IP:** Typically, the IP is incremented to point to the next instruction in sequence. However, control flow instructions (like `BLOCK_BREAK`, `BLOCK_BREAK_IF`, `LOOP_CONTINUE`, `LOOP_EXIT`) will modify the IP according to their specific logic, potentially jumping to different locations or causing the VM to adjust its stack of block/loop contexts. For instructions that `yield` to the `handle` method, the IP might not be advanced by the generator for these yielded instructions; it will resume at the same IP when `next()` is called again by the `handle` method.

*   **Instruction Dispatch:**
    *   The VM contains a set of handler functions, one for each type of VM instruction (e.g., a handler for `ACTOR_SEND`, another for `STATE_PUSH`, etc.).
    *   The "execute" step involves calling the appropriate handler based on the fetched instruction's type.
    *   Each handler function implements the semantics of its instruction:
        *   It may interact with the VM stack (pushing/popping contexts or values).
        *   It may resolve `ValueRef`s if they are operands.
        *   It may modify the IP based on structured control flow logic (e.g., moving to the instruction after a popped block, or to the start of a continued loop).
        *   For asynchronous operations, it prepares a command descriptor to be `yield`ed by the generator.

*   **Synchronous vs. Asynchronous Instructions (Generator Model):**
    *   Many instructions execute synchronously within the generator's internal loop (e.g., `NOOP`, `STATE_PUSH`, `STATE_UPDATE`, `BLOCK_ENTER` etc.). Their handlers complete their work, update the IP and VM stack as needed, and the loop immediately proceeds to the next instruction within the same call to `generator.next()`.
    *   Some instructions are inherently asynchronous, requiring interaction with the external environment (e.g., `BLOCK_ENTER_AWAIT`, `DELAY`, `ACTOR_SEND`, `ACTOR_SPAWN`). When such an instruction is encountered by the generator's internal loop:
        *   Its handler logic prepares a command descriptor (e.g., `{ type: 'AWAIT_MESSAGE' }` for the `BLOCK_ENTER_AWAIT` operation, or `{ type: 'DELAY', duration: 100 }` for `DELAY`, or `{ type: 'SEND', target: ..., message: ... }` for `ACTOR_SEND`, or `{ type: 'SPAWN', factory: ...}` for `ACTOR_SPAWN`).
        *   The generator then `yields` this command descriptor, pausing its execution. The IP is typically not advanced by the generator for these yielded instructions; it will resume at the same IP when `next()` is called again by the `handle` method.
        *   Upon resumption (via `generator.next(result)` from the `handle` method), the generator's internal loop continues from where it paused.
            *   For the `AWAIT_MESSAGE` command descriptor, the `result` (the message) is used to set up the temporary message state on the stack.
            *   For `DELAY`, the `result` (e.g. `null`) signals the delay has completed.
            *   For `SPAWN`, the `result` is the `ActorHandle` of the newly spawned child.
            *   For `SEND`, `KILL`, `COMPLETE`, `FAIL`, the `result` is typically `null` as these often don't pass data back into the VM's immediate next step but rather signal to the `handle` method what `HandlerAction` to return.

This internal cycle allows the VM to manage its state and control flow deterministically, preparing command descriptors for any operations that require external handling by the `handle` method.

##### 4.2. External Runner and Asynchronous Event Management

The synchronous worker's `handle(message, context)` method serves as the external runner and is responsible for driving the VM generator and managing all interactions with the actor system, including asynchronous operations initiated by VM commands.

*   **Processing Yielded Command Descriptors:**
    *   The VM `yields` command descriptor objects when it requires an external action or needs to pause for an event. These descriptors define the operation and its parameters. Examples include:
        *   `ACTOR_SEND`: `{ type: 'SEND', targetActor: ActorHandle, message: any }`
        *   `ACTOR_KILL`: `{ type: 'KILL', targetActor: ActorHandle }`
        *   `ACTOR_SPAWN`: `{ type: 'SPAWN', factory: ActorFactory<ActorHandle<I>, I, O> }`
        *   `DELAY`: `{ type: 'DELAY', durationMs: number }`
        *   `AWAIT_MESSAGE`: `{ type: 'AWAIT_MESSAGE' }`
    *   Terminal conditions are also communicated:
        *   `TASK_COMPLETE`: via `{ type: 'COMPLETE' }` or generator return.
        *   `TASK_FAIL`: via `{ type: 'FAIL', error: Error }` or generator throwing an error.

*   **Core `handle` Method Responsibilities:**
    *   The `handle` method is invoked by the scheduler when an initialization message is delivered to the actor, and subsequently whenever incoming messages are dispatched to the actor's inbox (potentially originating from itself).
    *   Depending on the input message, it initiates the VM generator if not already started, or resumes it if it was paused, potentially passing the incoming `message` (or a result from a previous operation like a child actor's handle or a delay completion signal) to `generator.next(result)`.
    *   It then enters a loop, processing command descriptors yielded by the generator:
        1.  Receives the yielded command descriptor.
        2.  Interprets the `type` of the command.
        3.  Performs the necessary action:
            *   For `ACTOR_SEND`, `ACTOR_KILL`: Prepares the corresponding `HandlerAction`. Resumes the VM (`generator.next(null)`) to see if more synchronous commands follow.
            *   For `ACTOR_SPAWN`: Calls `context.spawn(factoryFromDescriptor)`. Resumes the VM with the new `ActorHandle` (`generator.next(newHandle)`).
            *   For `DELAY`: Spawns an internal timer child actor using `context.spawn()`. The `handle` method then *pauses* the VM for this turn (does not call `generator.next()`). The timer child will send a message back to this actor when the delay is complete, and a future invocation of `handle` will process that message and resume the VM.
            *   For `AWAIT_MESSAGE`: The `handle` method *pauses* the VM. Future invocations of `handle` (due to new messages arriving) will check if the actor is in this awaiting state. If so, and the incoming message is relevant, it will resume the VM with `generator.next(incomingMessage)`.
            *   For `COMPLETE` or `FAIL`: Prepares to terminate the actor, possibly returning a final `HandlerAction.Kill(self)` or re-throwing an error to be handled by the scheduler.
        4.  If the VM yields multiple synchronous commands (e.g., several `SEND`s in a row without an intervening `DELAY` or `AWAIT_MESSAGE`), the `handle` method's internal loop continues to call `generator.next(null)` and accumulates `HandlerAction`s.
        5.  Once the VM yields a command that requires pausing (like `DELAY` or `AWAIT_MESSAGE`), or completes/fails, or its synchronous instruction sequence for the current resumption is exhausted (generator returns `{ done: true }` or yields a non-pausing command and the `handle` method decides to break its internal loop), the `handle` method returns the accumulated `HandlerAction[]` (or `null`) to the scheduler.

*   **Message Handling by the `handle` Method:**
    *   The actor's internal state must track when it's paused due to a `DELAY` or `AWAIT_MESSAGE` descriptor from the VM.
    *   If the actor is currently in an "awaiting message" state when a new message arrives (invoking `handle()`):
        *   The `handle` method passes the incoming message to `generator.next(incomingMessage)`.
        *   The VM then resumes. Its compiled instructions (e.g., for `when()` or `waitFor()`) will evaluate any predicates against this message.
        *   If the message doesn't satisfy a `waitFor` predicate, the VM's internal loop might yield `AWAIT_MESSAGE` again.
        *   If the message is consumed (satisfies predicate or is processed by `when`), the VM continues to the next instruction.
    *   If the actor is currently in an "awaiting delay" state when a new message arrives, `generator.next()` is invoked with a `null` argument to resume execution.
    *   The `handle` method does not need its own message buffer beyond what the scheduler provides, as it processes one external message per invocation. The "pausing" refers to the VM's generator state.

*   **Task Lifecycle Integration:**
    *   The `handle` method, by processing `COMPLETE` or `FAIL` descriptors from the VM, manages the actor's lifecycle. It can return `HandlerAction.Kill(self)` to the scheduler when the declarative definition completes or fails.

This cooperative model ensures the main scripted worker remains synchronous, leveraging existing actor messaging primitives for all interactions and for managing the execution flow of its internal, synchronous VM generator.

### Top-level APIs

*   **`act<T>(definition: (self: ActorHandle<T>, helpers: { outbox: ActorHandle<T>, complete: () => ActorCommand<T>, fail: (error: Error) => ActorCommand<unknown> }) => ActorCommand<T>) -> ActorDefinition<T>`**
    *   **Description:** The main factory function for creating a scripted worker definition. It accepts a `definition` function callback that outlines the worker's lifecycle, interactions, and responses to incoming messages. The `definition` function must return a single `ActorCommand` (commonly `sequence(...)` or `withState(...)`) which serves as the root of the worker's behavior tree.
    *   **Type Parameters:**
        *   `T`: The union type of messages that the worker defined by this definition can send and receive.
    *   **Parameters:**
        *   `definition`: `(self: ActorHandle<T>, helpers: { ... }) => ActorCommand<T>`
            A callback function invoked to build the worker's behavior. It receives two arguments:
            *   `self: ActorHandle<T>`: An `ActorHandle` representing the worker itself.
            *   `helpers`: An object containing helper utilities related to the actor:
                *   `outbox: ActorHandle<T>`: Handle for the actor receiving messages from this worker definition (typically the system or parent).
                *   `complete(): ActorCommand<T>`: Terminate the current task successfully (see below)
                *   `fail(error: Error): ActorCommand<T>`: Terminate the current task with an error (see below)
    *   **Return Value:** `ActorDefinition<T>`: An opaque definition object representing the compiled behavior.
    *   **Example (Overall Structure):**
        ```typescript
        interface MyMessage { type: "PING" | "PONG" | "INIT_DATA"; payload?: any; }
        interface MyState { initialized: boolean; data?: any; }

        const myWorkerDefinition = act<MyMessage>((self, { outbox, complete, fail }) =>
          withState<MyState, MyMessage>(() => ({ initialized: false }), stateHandle =>
            sequence(() => [
              waitFor((msg): msg is Extract<MyMessage, { type: "INIT_DATA" }> => msg.type === "INIT_DATA",
                (msgHandle) => sequence(() => [
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

### Worker Definition Helpers

This section describes the helper functions provided within the `helpers` object to the `act` definition callback.

*   **`complete<T>(): ActorCommand<T>`**
    *   **Description:** Returns a command that, when executed, terminates the current worker's task successfully.
    *   **Type Parameters:**
        *   `T`: The message type of the worker definition, for command type consistency.
    *   **Parameters:** None.
    *   **Return Value:** `ActorCommand<T>`: A command that signals normal completion of the actor.
    *   **Behavior:** When this command is processed by the VM, it will yield a `TASK_COMPLETE` descriptor, leading the runner to finalize the worker's execution as successful. No further commands within the current worker definition will be processed.
    *   **Example:**
        ```typescript
        act((self, { outbox, complete }) => sequence(() => [
          send(outbox, { type: "FINAL_MESSAGE" }),
          complete()
        ]))
        ```

*   **`fail<T>(error: Error): ActorCommand<T>`**
    *   **Description:** Returns a command that, when executed, terminates the current worker's task with an error.
    *   **Type Parameters:**
        *   `T`: The message type of the worker definition. While the command signals failure for a worker of type `T`, the command itself can be considered `ActorCommand<unknown>` or `ActorCommand<never>` in some contexts as it leads to termination. For consistency within `act`, it's typed as `ActorCommand<T>`.
    *   **Parameters:**
        *   `error: Error`: The error object to fail the task with.
    *   **Return Value:** `ActorCommand<T>`: A command that signals an error-based termination of the actor.
    *   **Behavior:** When this command is processed by the VM, it will yield a `TASK_FAIL` descriptor with the provided error, leading the runner to finalize the worker's execution as failed. No further commands within the current worker definition will be processed.
    *   **Example:**
        ```typescript
        act((self, { outbox, fail }) => sequence(() => [
          // Some operation that might lead to an error condition
          whenState(
            readState(someStateHandle, state => state.isInvalid),
            fail(new Error("Invalid state encountered.")),
            send(outbox, { type: "PROCEEDING" })
          )
        ]))
        ```

### Command combinators

*   **`send<T, TTarget>(target: ActorHandle<TTarget>, message: ValueRef<TTarget>): SendAction<T, TTarget>`**
    *   **Description:** Immediately yields the specified message (or a message resolved from state) from the worker's iterator. The message is automatically wrapped in a `HandlerAction.Send(target, message)` internally.
    *   **Type Parameters:**
        *   `T`: The message type of the worker definition, for command type consistency.
        *   `TTarget`: The union type of messages that the `target` actor can receive.
    *   **Parameters:**
        *   `target: ActorHandle<TTarget>`: The handle of the actor to send the message to.
        *   `message: ValueRef<TTarget>`: The message to send.
    *   **Return Value:** `SendAction<T, TTarget>`: A command that, when executed, will send the message.
    *   **Behavior:** The worker yields `[HandlerAction.Send(target, message)]`. Execution continues immediately.
    *   **Example:**
        ```typescript
        // Literal message
        send(outbox, { type: "DATA", value: 42 })
        
        // Message from state
        withState(() => ({ id: "123" }), idHandle => 
          send(outbox, readState(idHandle, s => ({ type: "USER_ID", id: s.id })))
        )
        ```

*   **`kill<T>(target: ActorHandle<unknown>): KillAction<T>`**
    *   **Description:** Immediately yields a `HandlerAction.Kill` for the specified `target` actor handle.
    *   **Type Parameters:**
        *   `T`: The message type of the worker definition, for command type consistency.
    *   **Parameters:**
        *   `target: ActorHandle<unknown>`: The handle of the actor to kill.
    *   **Return Value:** `KillAction<T>`: A command that, when executed, will kill the target actor.
    *   **Behavior:** The worker's underlying async generator yields `[HandlerAction.Kill(target)]`.
    *   **Example:**
        ```typescript
        sequence(() => [
          send(outbox, { type: 'INITIALIZING' }),
          delay(50),
          kill(self), 
          send(outbox, { type: 'THIS_WONT_RUN' }) 
        ])
        ```

*   **`waitFor<T, TNarrowed extends T>(predicate: ValueRef<((message: T) => message is TNarrowed)>, commandIfTrue?: (messageHandle: StateHandle<TNarrowed>) => ActorCommand<T>): WaitForAction<T, TNarrowed>`**
    *   **Description:** Pauses worker execution until an incoming message satisfies the `predicate`. If a `commandIfTrue` is provided, it's invoked with a `StateHandle` for the consumed message (type-narrowed). The factory returns a command to be executed. To access message fields within the factory, use `readState(messageHandle, msg => ...)`. The `messageHandle` is temporary and valid only within the `commandIfTrue` callback.
    *   **Type Parameters:**
        *   `T`: The general union type of messages the worker can receive.
        *   `TNarrowed extends T`: A narrowed subtype of `T`, used when the `predicate` acts as a type guard.
    *   **Parameters:**
        *   `predicate: ValueRef<((message: T) => message is TNarrowed)>`: A function that evaluates an incoming message. If it's a type guard, `TNarrowed` will be the type of the message if the predicate returns `true`.
        *   `commandIfTrue?: (messageHandle: StateHandle<TNarrowed>) => ActorCommand<T>`: An optional factory function called if the `predicate` returns `true`. It receives a `StateHandle` for the consumed (and potentially type-narrowed) message and must return an `ActorCommand` to be executed.
    *   **Return Value:** `WaitForAction<T, TNarrowed>`: A command that, when executed, will wait for and process a message according to the predicate.
    *   **Behavior:**
        1.  Worker execution pauses, awaiting an incoming message. This awaiting process is part of a loop inherent to the `waitFor` command's compiled structure.
        2.  On message arrival, the `predicate(message)` is evaluated.
        3.  If the `predicate` returns `true`:
            a.  If `commandIfTrue` was provided, it is called with a `StateHandle` for the consumed (and potentially type-narrowed) message. The command returned by this factory is then executed.
            b.  If no `commandIfTrue` was provided (i.e., it's an implicit `noop`), the `waitFor` command completes successfully.
            c.  The internal loop of the `waitFor` command is then exited, and execution proceeds to the next command in the worker's sequence.
        4.  If the `predicate` returns `false`:
            a.  The current message is effectively discarded.
            b.  The `waitFor` command continues its internal loop, re-entering a state of awaiting the next incoming message.
            c.  This process repeats until a message satisfies the `predicate`.
    *   **Example:**
        ```typescript
        withState(() => ({ status: 'idle', userRole: 'user' }), appStateHandle =>
          withState(() => ({ isLocked: true }), itemStateHandle => 
            sequence<MyMessage>([
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

*   **`delay<T>(durationMs: ValueRef<number>): DelayAction<T>`**
    *   **Description:** Pauses execution for the specified duration (in milliseconds).
    *   **Type Parameters:**
        *   `T`: The message type of the worker definition. This is used for consistency with other commands but doesn't directly affect the `delay` operation itself.
    *   **Parameters:**
        *   `durationMs: ValueRef<number>`: The duration to wait in milliseconds.
    *   **Return Value:** `DelayAction<T>`: A command that, when executed, will pause the actor for the specified duration.
    *   **Behavior:** The worker waits for the duration specified by `durationMs`. Commands in a sequence are executed sequentially; for instance, a `delay` command will fully complete before any subsequent command (like `waitFor` or `when`) begins execution. Messages arriving from external sources while a `delay` (or any other non-message-consuming command) is active are typically buffered by the underlying actor system and will be processed by the next relevant message-consuming command (e.g., `waitFor`, `when`) once it becomes active.
    *   **Example:**
        ```typescript
        // Literal duration
        delay(100)
        
        // Duration from state
        withState(() => ({ waitTime: 200 }), timeHandle => 
          delay(readState(timeHandle, s => s.waitTime))
        )
        ```

*   **`noop<T>(): NoopAction<T>`**
    *   **Description:** A no-operation command.
    *   **Type Parameters:**
        *   `T`: The message type of the worker definition, for command type consistency.
    *   **Parameters:** None.
    *   **Return Value:** `NoopAction<T>`: A command that performs no action when executed.
    *   **Behavior:** The runner skips this command.
    *   **Example:**
        ```typescript
        whenState(
          readState(someHandle, s => s.shouldIgnore),
          noop(), // Do nothing if condition is true
          send(outbox, { type: 'PROCESS' })
        )
        ```

*   **`sequence<T>(commandsFactory: (controls: { done: () => ActorCommand<T> }) => Array<ActorCommand<T>>): SequenceAction<T>`**
    *   **Description:** Executes a sequence of commands returned by the `commandsFactory`. The factory function receives a `controls` object with a `done()` method, which returns a command that can be executed to terminate the current `sequence` block early.
    *   **Type Parameters:**
        *   `T`: The message type of the worker definition, for command type consistency within the sequence.
    *   **Parameters:**
        *   `commandsFactory: (controls: { done: () => ActorCommand<T> }) => Array<ActorCommand<T>>`: A factory function that returns an array of `ActorCommand<T>` to be executed in sequence. It receives a `controls` object containing a `done` function. Executing the command generated by `controls.done()` will cause the sequence to terminate prematurely.
    *   **Return Value:** `SequenceAction<T>`: A command that, when executed, will run the sequence of commands returned by the factory.
    *   **Behavior:** Executes commands returned by the factory in the provided order. If the command generated by `controls.done()` is executed, execution of the current `sequence` block halts, and control passes to the command following the `sequence` block. If the factory completes without executing `controls.done()`, the sequence completes after the last command in the array, and then control proceeds.
    *   **Example:** (See various examples throughout)

*   **`withState<T, S>(initialState: ValueRef<() => S>, factory: (stateHandle: StateHandle<S>) => ActorCommand<T>): WithStateAction<T, S>`**
    *   **Description:** Defines a stateful command scope. It creates an initial state and provides a `stateHandle` to the `factory` function. The `factory` returns a command that operates within this state scope.
    *   **Type Parameters:**
        *   `T`: The message type of the worker definition, for command type consistency of the command returned by the `factory`.
        *   `S`: The type of the state being managed within this scope.
    *   **Parameters:**
        *   `initialState: ValueRef<() => S>`: A function that returns the initial state value.
        *   `factory: (stateHandle: StateHandle<S>) => ActorCommand<T>`: A factory function that receives a `StateHandle<S>` for the newly created state and must return an `ActorCommand<T>` that will operate within this state's context.
    *   **Return Value:** `WithStateAction<T, S>`: A command that, when executed, establishes a state scope and runs the command returned by the `factory`.
    *   **Behavior:**
        1.  Invokes `initialState()` to get the state value.
        2.  Creates a `stateHandle` for this state.
        3.  Invokes `factory(stateHandle)` to get the command body for this stateful block.
        4.  Commands like `modifyState`, `readState`, and `computeState` use this `stateHandle`.
    *   **Example (Structure):**
        ```typescript
        act<MyMessage>((self, { outbox, complete }) => (
          withState(() => ({ counter: 0 }), stateHandle => sequence<MyMessage>([
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

*   **`modifyState<T, S>(stateHandle: StateHandle<S>, updater: (currentState: S) => S): ModifyStateAction<T, S>`**
    *   **Description:** Synchronously updates the state associated with `stateHandle`.
    *   **Type Parameters:**
        *   `T`: The message type of the worker definition, for command type consistency. It does not directly affect the state modification itself.
        *   `S`: The type of the state being modified.
    *   **Parameters:**
        *   `stateHandle: StateHandle<S>`: The handle to the state that needs to be updated.
        *   `updater: (currentState: S) => S`: A function that takes the current state `S` and returns the new state `S`.
    *   **Return Value:** `ModifyStateAction<T, S>`: A command that, when executed, will update the specified state.
    *   **Behavior:** Retrieves current state, calls `updater`, updates state with the new value.
    *   **Example (within `withState` -> `sequence`):**
        ```typescript
        withState(() => ({ count: 0 }), stateHandle =>
          sequence<MyMessage>([ 
            modifyState(stateHandle, s => ({ count: s.count + 1 })),
          ])
        )
        ```

*   **`whenState<T>(predicate: ValueRef<boolean>, commandIfTrue: ActorCommand<T>, commandIfFalse?: ActorCommand<T>): WhenStateAction<T>`**
    *   **Description:** Conditionally executes a command based on a `ValueRef<boolean>`. The `predicate` is typically created using `readState` (for single state dependency) or `computeState` (for multiple state dependencies), both of which return specific types of `ValueRef<boolean>`.
    *   **Type Parameters:**
        *   `T`: The message type of the worker definition, for command type consistency of the conditional commands.
    *   **Parameters:**
        *   `predicate: ValueRef<boolean>`: The boolean predicate. This determines which command branch is executed.
        *   `commandIfTrue: ActorCommand<T>`: The command to execute if the `predicate` resolves to `true`.
        *   `commandIfFalse?: ActorCommand<T>`: An optional command to execute if the `predicate` resolves to `false`.
    *   **Return Value:** `WhenStateAction<T>`: A command that, when executed, will conditionally run one of the provided commands based on resolved state.
    *   **Behavior:** Evaluates the `predicate`. Executes `commandIfTrue` or `commandIfFalse` accordingly.
    *   **Example:**
        ```typescript
        withState(() => ({ status: 'idle', userRole: 'user' }), appStateHandle =>
          withState(() => ({ isLocked: true }), itemStateHandle => 
            sequence<MyMessage>([
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

*   **`when<T, TNarrowed extends T>(predicate: ValueRef<((message: T) => message is TNarrowed)>, commandIfTrue: (messageHandle: StateHandle<TNarrowed>) => ActorCommand<T>, commandIfFalse?: (messageHandle: StateHandle<T>) => ActorCommand<T>): ActorCommand<T>`**
    *   **Description:** Waits for the next incoming message from the worker's inbox, consumes it, and then conditionally executes a command returned by one of two factories based on the `predicate`. This command *always* consumes one message upon invocation, regardless of whether its predicate is state-based or directly uses the message content. The factories receive a `StateHandle<T>` for the incoming message (type-narrowed to `TNarrowed` for `commandIfTrue` if the predicate is a type guard), allowing message fields to be accessed via `readState(messageHandle, ...)`. This `messageHandle` is temporary and valid only within its respective factory callback (`commandIfTrue` or `commandIfFalse`).
    *   **Type Parameters:**
        *   `T`: The general union type of messages the worker can receive.
        *   `TNarrowed extends T`: A narrowed subtype of `T`, used when the `predicate` acts as a type guard.
    *   **Parameters:**
        *   `predicate: ValueRef<((message: T) => message is TNarrowed)>`: A function (often a type guard) that evaluates the incoming message.
        *   `commandIfTrue: (messageHandle: StateHandle<TNarrowed>) => ActorCommand<T>`: A factory function that returns the command that will be executed if the `predicate` returns `true`. It receives a `StateHandle` for the consumed (and type-narrowed) message and must return an `ActorCommand` to be executed.
        *   `commandIfFalse?: (messageHandle: StateHandle<T>) => ActorCommand<T>`: An optional factory function that returns the command that will be executed if the `predicate` returns `false`. It receives a `StateHandle` for the consumed message (not narrowed) and must return an `ActorCommand` to be executed.
    *   **Return Value:** `ActorCommand<T>`: A command that, when executed, will consume a message and conditionally execute further commands based on that message.
    *   **Behavior:**
        1.  Awaits an incoming message and consumes it from the inbox.
        2.  Creates temporary `StateHandle` for the message.
        3.  Evaluates `predicate(message)`.
        4.  If `true`, calls `commandIfTrue(messageHandle)` and executes the returned command.
        5.  If `false`, calls `commandIfFalse(messageHandle)` (if provided) and executes its result.
    *   **Example:**
        ```typescript
        sequence<MyMessage>([
          when<MyMessage, StartMsg>(
            (msg): msg is StartMsg => msg.type === 'START',
            (msgHandle) => send(outbox, readState(msgHandle, (startMsg: StartMsg) => ({ type: 'STARTED', id: startMsg.payload.id }))),
            (msgHandle) => send(outbox, readState(msgHandle, (msg: MyMessage) => ({ type: 'UNEXPECTED_MSG', receivedType: msg.type })))
          ),
          delay(100)
        ])
        ```

*   **`whileLoop<T>(factory: (controls: { break: () => ActorCommand<T>, continue: () => ActorCommand<T> }) => ActorCommand<T>): WhileLoopAction<T>`**
    *   **Description:** Creates a command that repeatedly executes a body command sequence provided by the `factory` function. Loop control (`break`, `continue`) is explicit via the `controls` object passed to the factory. State-dependent logic within the loop body should use `whenState` or `readState` with a lexically captured `StateHandle`.
    *   **Type Parameters:**
        *   `T`: The message type of the worker definition, for command type consistency of the commands within the loop and the loop control commands.
    *   **Parameters:**
        *   `factory: (controls: { break: () => ActorCommand<T>, continue: () => ActorCommand<T> }) => ActorCommand<T>`: A factory function that returns a command that will be executed at the beginning of each loop iteration. The factory receives a `controls` object with `break` and `continue` functions (which return commands to control the loop) and must return an `ActorCommand<T>` representing the body of the loop for that iteration.
    *   **Return Value:** `WhileLoopAction<T>`: A command that, when executed, will run the loop.
    *   **Behavior:** Executes the command returned by `factory` repeatedly. Executing the command returned by `controls.break()` terminates the loop. Executing the command returned by `controls.continue()` immediately skips to the next iteration, re-evaluating the command returned by the factory. If the command returned by the `factory` completes without an explicit `controls.break()` or `controls.continue()` being executed, the loop implicitly continues to the next iteration.
    *   **Example:**
        ```typescript
        withState(() => ({ count: 0 }), handle =>
          sequence<MyMessage>([
            whileLoop((loop) =>
              sequence(() => [
                whenState(
                  readState(handle, s => s.count >= 3),
                  loop.break(), // Break if count >= 3
                  sequence(() => [ // Else continue
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

*   **`spawn<T, C, I, O>(factory: ActorFactory<C, I, O>, config: C, next: (handle: SpawnedActorResolver<I>) => ActorCommand<T>): SpawnAction<T, C, I, O>`**
    *   **Description:** Creates a command to spawn a new child actor and then execute a subsequent command that can use the child actor's handle. The `factory` argument expects an actor factory for the child (e.g. a worker definition created via the `act()` API). The `config` argument is the configuration to be passed to the child actor's factory. The `next` function is a callback that receives the `ActorHandle` of the newly spawned child and must return an `ActorCommand` that the parent worker will execute after the child actor has been spawned.
    *   **Type Parameters:**
        *   `T`: The message type of the parent worker's definition (the context where `spawn` is used).
        *   `C`: The configuration type of the child actor being spawned. This is the type of the argument used to instantiate the child actor factory.
        *   `I`: The input message type of the child actor being spawned.
        *   `O`: The output message type of the child actor being spawned.
    *   **Parameters:**
        *   `factory: ActorFactory<C, I, O>`: The factory function or `ActorDefinition` for the child actor to be spawned. This is typically a worker definition (the result of calling `act<I>(...)`), however any valid actor factory can be provided.
        *   `config: C`: The configuration to be passed to the child actor. This value will be used to instantiate the child actor factory function as its second argument. For a child actor that sends messages back to its parent worker, the `config` argument would typically be the parent worker's `self` handle or its `outbox` handle.
        *   `next: (handle: SpawnedActorResolver<I>) => ActorCommand<T>`: A callback function that returns a command that is executed after the child actor has been spawned. It receives a `SpawnedActorResolver<I>` that refers to the `ActorHandle<I>` of the new child actor and must return an `ActorCommand<T>` to be executed by the parent worker.
    *   **Return Value:** `SpawnAction<T, C, I, O>`: An `ActorCommand` that, when executed by the parent worker, will spawn the child actor defined by `factory` with the given `config`, then execute the command returned by the `next` callback (whose actor handle resolver will resolve to the handle of the newly-resolved child actor).
    *   **Behavior:** When the `SpawnAction` is executed within a parent worker's command sequence (e.g., `sequence`), the runtime system first spawns the child actor using the provided `factory` and `config`. Once the child is active, the command returned by `next` is then executed by the parent worker, with the child actor's `ActorHandle` exposed via the `SpawnedActorResolver` accessor.
    *   **Example:**
        ```typescript
        type ParentMsg = { type: 'CHILD_RESPONSE', data: string } | { type: 'INIT_CHILD' } | { type: 'CHILD_RESPONSE_RECEIVED', payload: string };
        type ChildMsg = { type: 'GREET', from: string } | { type: 'RESPOND_TO_PARENT', payload: string };

        // Define the child actor
        // Define the child actor
        const childActorDefinition = act<ChildMsg, ActorHandle<ParentMsg>>((_self, parentOutbox) =>
          sequence<ChildMsg>(() => [
            waitFor((msg): msg is Extract<ChildMsg, { type: 'GREET' }> => msg.type === 'GREET',
              (msgHandle) =>
                send(parentOutbox, readState(msgHandle, (greetMsg) => ({ 
                  type: 'CHILD_RESPONSE', 
                  data: `Hello ${greetMsg.from}! Child received your greeting.`
                } as ParentMsg))) // Ensure message type matches parent's outbox
            ),
            // Child might complete or do other things
          ])
        );

        // Define the parent actor
        const parentActorDefinition = act<ParentMsg>((self, { outbox, complete }) =>
          sequence<ParentMsg>(() => [
            send(outbox, { type: 'INIT_CHILD' }),
            spawn(
              childActorDefinition,
              outbox, // Pass parent's outbox as config to the child
              (childHandle) =>
                sequence(() => [
                  // childHandle is ActorHandle<ChildMsg>
                  send(childHandle, { type: 'GREET', from: 'ParentActor' }),
                  waitFor((msg): msg is Extract<ParentMsg, { type: 'CHILD_RESPONSE' }> => msg.type === 'CHILD_RESPONSE',
                    (msgHandle) =>
                      sequence(() => [
                        send(outbox, readState(msgHandle, (responseMsg) => ({ type: 'CHILD_RESPONSE_RECEIVED', payload: responseMsg.data } as ParentMsg))),
                        complete() // Parent completes
                      ])
                  )
                ])
            ),
            // Note: The parent might complete before or after the child,
            // depending on the logic within the 'next' callback and child's behavior.
          ])
        );
        ```

### State accessors

*   **`readState<S, V>(input: ValueRef<S>, selector: (currentState: S) => V): ReadStateValueResolver<S, V>`**
    *   **Description:** Creates a placeholder operand that is dynamically resolved at runtime to retrieve a value derived from a single input `ValueRef<S>`, according to the provided `selector` function. The placeholder operand can be used as an argument to any command that accepts a `ValueRef<V>`.
    *   **Type Parameters:**
        *   `S`: The type of the value resolved from the `input` ValueRef.
        *   `V`: The type of the value returned by the `selector` function.
    *   **Parameters:**
        *   `input: ValueRef<S>`: The `ValueRef` (e.g., a `StateHandle` or another resolver) whose resolved value will be passed to the `selector`.
        *   `selector: (currentState: S) => V`: A function that takes the resolved value `S` from the `input` and returns a selected value `V`.
    *   **Return Value:** `ReadStateValueResolver<S, V>`: An opaque resolver object that, when used by a command, will provide the value selected from the resolved input at the time of resolution.
    *   **Behavior:** Returns an opaque `ReadStateValueResolver<S, V>` object. The command execution engine uses this to: 1. Resolve the `input: ValueRef<S>`. 2. Apply the `selector` to the resolved value. The result of the `selector` is the final value.
    *   **Example:**
        ```typescript
        // Used with send, input is a StateHandle:
        send(outbox, readState(dataHandle, s => ({ type: "CURRENT_DATA", payload: s.info })));

        // Used with delay, input is a StateHandle:
        delay(readState(configHandle, s => s.timeoutMs));
        
        // Chained example: input is another readState resolver
        const getConfig = () => ({ complex: { timeoutMs: 500 } });
        withState(getConfig, configHandle => 
          delay(readState(
            readState(configHandle, config => config.complex), // Inner readState resolves to { timeoutMs: 500 }
            complexConfig => complexConfig.timeoutMs // Outer readState selects timeoutMs
          ))
        );
        ```

*   **`computeState<S extends ReadonlyArray<unknown>, V>(inputs: { [K in keyof S]: ValueRef<S[K]> }, combine: (...values: S) => V): ComputeStateValueResolver<S, V>`**
    *   **Description:** Creates a placeholder operand that is dynamically resolved at runtime to retrieve a value derived from an array of `ValueRef`s, according to the provided `combine` function. The placeholder operand can be used as an argument to any command that accepts a `ValueRef<V>`.
    *   **Type Parameters:**
        *   `S`: A tuple type representing the types of the values that will be resolved from the `inputs` array.
        *   `V`: The type of the value returned by the `combine` function and consequently the type of the resolved value.
    *   **Parameters:**
        *   `inputs: { [K in keyof S]: ValueRef<S[K]> }`: A read-only array (tuple) of `ValueRef`s. Each `ValueRef` in this array will be resolved.
        *   `combine: (...values: S) => V`: A function that takes the resolved values from the `inputs` array (in the same order) and returns a computed value `V`.
    *   **Return Value:** `ComputeStateValueResolver<S, V>`: An opaque resolver object that, when used by a command, will provide the computed value `V` at the time of resolution.
    *   **Behavior:** When resolved by the interpreter:
        1.  Each `ValueRef` in the `inputs` array is resolved to its respective value.
        2.  The `combine` function is called with these resolved values in the same order as the `inputs` array.
        3.  The return value of `combine` is the result of this `computeState` operation, encapsulated within the `ComputeStateValueResolver`.
    *   **Example:**
        ```typescript
        const greetingResolver = computeState(
          [appStateHandle, userPrefsHandle, readState(configHandle, c => c.appName)], // inputs can be handles or other resolvers
          (appState, userPrefs, appName) => 
            `Hello, ${appState.name} on ${appName}! Your lang is ${userPrefs.preferredLang}.`
        );
        ```
