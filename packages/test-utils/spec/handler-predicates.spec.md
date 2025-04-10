## Handler-Specific Predicates

Specialized predicates are provided for testing ReactiveKit actor handlers against the sequence of actions they perform.

```typescript
import type { ActorHandle } from "@actors/core";
import { HandlerActionType, type HandlerAction } from "@actors/core/types/internal";
import { type Message } from "@actors/core/types/message";

// Example Message Types (replace with actual types)
const MESSAGE_INCREMENT = "INCREMENT";
const MESSAGE_DECREMENT = "DECREMENT";
type MESSAGE_INCREMENT = typeof MESSAGE_INCREMENT;
type MESSAGE_DECREMENT = typeof MESSAGE_DECREMENT;

// Example Message Interfaces (replace with actual interfaces)
interface IncrementMessage extends Message<MESSAGE_INCREMENT> {
  payload: { value: number };
}

interface DecrementMessage extends Message<MESSAGE_DECREMENT> {
  payload: { value: number };
}

// Example Handles (replace with actual handles)
declare const counterHandle: ActorHandle<any, any>;
declare const managerHandle: ActorHandle<any, any>;

// Match action type (acts as a type guard)
hasActionType(HandlerActionType.Send); // narrows type to SendAction
hasActionType(HandlerActionType.Spawn); // narrows type to SpawnAction
hasActionType(HandlerActionType.Kill); // narrows type to KillAction

// Match message type (requires SendAction type)
// Typically used within an `and` combinator after `hasActionType`
and(
  hasActionType(HandlerActionType.Send),
  hasMessageType<IncrementMessage>(MESSAGE_INCREMENT) 
);

// Match message payload (requires SendAction type)
// Can use deep equality via `equals` or a predicate function
and(
  hasActionType(HandlerActionType.Send),
  hasMessagePayload({ value: 42 }) // Uses deep equality internally
);

and(
  hasActionType(HandlerActionType.Send),
  hasMessagePayload<{ count: number }>(payload => payload.count > 10) // Uses predicate function
);

// Match message target (for SendAction or SpawnAction)
and(
  hasActionType(HandlerActionType.Send), 
  sentTo(counterHandle)
);

// Match message source (only relevant for SendAction received by an actor)
// Note: This predicate typically applies to received messages, not handler actions.
// Example assumes a context where received messages are being tested.
// sentFrom(managerHandle)

// Example: Matching a specific send action
and(
  hasActionType(HandlerActionType.Send),
  sentTo(counterHandle),
  hasMessageType<IncrementMessage>(MESSAGE_INCREMENT),
  hasMessagePayload({ value: 1 })
);
```

### Type Narrowing

Predicates play an important role in type narrowing, especially for discriminated unions like `HandlerAction`. The `hasActionType` predicate is a type guard, meaning TypeScript understands that within its scope (e.g., inside an `and` block), the action must be of the specified type. This allows subsequent predicates like `hasMessageType` or `hasMessagePayload` to safely access properties specific to that action type.

```typescript
import { HandlerActionType, type HandlerAction, type SendAction } from "@actors/core/types/internal";
import { type Message, type MessageType } from "@actors/core/types/message";

// Base HandlerAction type (simplified for example)
type ExampleHandlerAction = 
  | { type: HandlerActionType.Send; target: any; message: Message<any> }
  | { type: HandlerActionType.Spawn; target: any; }
  | { type: HandlerActionType.Kill; target: any; };

// hasActionType acts as a type guard
function hasActionType<T extends HandlerActionType>(
  type: T
): (action: ExampleHandlerAction) => action is Extract<ExampleHandlerAction, { type: T }> {
  return (action): action is Extract<ExampleHandlerAction, { type: T }> => 
    action.type === type;
}

// hasMessageType requires the action type to be narrowed to SendAction
function hasMessageType<M extends Message<any>>(
  type: MessageType<M>
): (action: Extract<ExampleHandlerAction, { type: HandlerActionType.Send }>) => boolean {
  // This predicate can now safely access `action.message`
  return (action) => action.message.type === type;
}

// Example usage demonstrating type narrowing
declare const actions: Array<ExampleHandlerAction>;
declare const MESSAGE_PING: "PING";
interface PingMessage extends Message<"PING"> { payload: null };

const pingMessages = actions.filter(
  and(
    // 1. Narrow action to SendAction
    hasActionType(HandlerActionType.Send), 
    // 2. Now we can safely check the message type
    hasMessageType<PingMessage>(MESSAGE_PING)
  )
);
// Type of pingMessages is now Array<SendAction<PingMessage>>
``` 

## Implementation Details

*(Note: These predicates typically operate on `TestAction` objects, which wrap the actual `HandlerAction` and include context like the source actor handle (`from`). Placeholder names like `TEST_ACTION_SEND` represent example `TestAction` instances.)*

*   **`hasActionType(type: HandlerActionType)`**
    *   **Description:** Checks if the `action[VARIANT]` (internal type discriminator) matches the specified `HandlerActionType`. Acts as a type guard.
    *   **Matches:**
        ```typescript
        hasActionType(HandlerActionType.Send)(TEST_ACTION_SEND)
        ```
    *   **Does Not Match:**
        ```typescript
        hasActionType(HandlerActionType.Spawn)(TEST_ACTION_SEND)
        ```

*   **`hasMessageType<M extends Message>(type: M['type'])`**
    *   **Description:** Checks if the `action.message.type` matches the specified message `type`. Requires the input `TestAction` to contain a `SendHandlerAction`. Acts as a type guard for the message type.
    *   **Matches:**
        ```typescript
        // Assuming TEST_ACTION_SEND_INCREMENT has action.message.type === MESSAGE_INCREMENT
        hasMessageType(MESSAGE_INCREMENT)(TEST_ACTION_SEND_INCREMENT)
        ```
    *   **Does Not Match:**
        ```typescript
        // Assuming TEST_ACTION_SEND_INCREMENT has action.message.type === MESSAGE_INCREMENT
        hasMessageType(MESSAGE_DECREMENT)(TEST_ACTION_SEND_INCREMENT)
        ```

*   **`hasMessagePayload<P>(predicate: Predicate<P>)`**
    *   **Description:** Applies the given `predicate` to the `action.message.payload`. Requires the input `TestAction` to contain a `SendHandlerAction`.
    *   **Matches:**
        ```typescript
        // Assuming TEST_ACTION_SEND_INCREMENT_VALUE_1 has action.message.payload === { value: 1 }
        hasMessagePayload(equals({ value: 1 }))(TEST_ACTION_SEND_INCREMENT_VALUE_1)
        ```
    *   **Does Not Match:**
        ```typescript
        // Assuming TEST_ACTION_SEND_INCREMENT_VALUE_1 has action.message.payload === { value: 1 }
        hasMessagePayload(equals({ value: 2 }))(TEST_ACTION_SEND_INCREMENT_VALUE_1)
        ```

*   **`sentTo(targetPredicate: Predicate<ActorHandle>)`**
    *   **Description:** Applies the `targetPredicate` to the `action.target` field. Requires the input `TestAction` to contain an action with a `target` (e.g., `SendHandlerAction`, `SpawnHandlerAction`).
    *   **Matches:**
        ```typescript
        // Assuming TEST_ACTION_SEND_TO_TARGET has action.target === TARGET_HANDLE
        sentTo(is(TARGET_HANDLE))(TEST_ACTION_SEND_TO_TARGET)
        ```
    *   **Does Not Match:**
        ```typescript
        // Assuming TEST_ACTION_SEND_TO_TARGET has action.target === TARGET_HANDLE
        sentTo(is(OTHER_HANDLE))(TEST_ACTION_SEND_TO_TARGET)
        ```

*   **`sentFrom(sourcePredicate: Predicate<ActorHandle>)`**
    *   **Description:** Applies the `sourcePredicate` to the `from` field of the `TestAction` object itself (representing the actor that produced the action).
    *   **Matches:**
        ```typescript
        // Assuming TEST_ACTION_FROM_SOURCE has from === SOURCE_HANDLE
        sentFrom(is(SOURCE_HANDLE))(TEST_ACTION_FROM_SOURCE)
        ```
    *   **Does Not Match:**
        ```typescript
        // Assuming TEST_ACTION_FROM_SOURCE has from === SOURCE_HANDLE
        sentFrom(is(OTHER_HANDLE))(TEST_ACTION_FROM_SOURCE)
        