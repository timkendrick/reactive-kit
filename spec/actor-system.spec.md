# Actor System

## Overview
The Actor System is a core component of Reactive Kit that provides a message-based concurrency model for handling side effects and asynchronous operations. Actors communicate through typed messages and maintain isolated state, enabling deterministic behavior and controlled concurrency.

## Examples

### Basic Actor
```typescript
interface Message<T> {
  type: T;
}

enum AppMessageType {
  Increment,
  Decrement,
  Result,
  Destroy,
}

interface ResultMessage extends Message<AppMessageType.Result> {
  value: number;
}

class CounterActor implements Actor<IncrementMessage | DecrementMessage> {
  private counter = 0;
  
  public handle(
    message: AppMessage,
    context: HandlerContext<AppMessage>,
  ): HandlerResult<AppMessage> {
    switch (message.type) {
      case AppMessageType.Increment:
        return [
          HandlerAction.Send(this.output, {
            type: AppMessageType.Result,
            value: ++this.counter,
          }),
        ];
      case AppMessageType.Decrement:
        return [
          HandlerAction.Send(this.output, {
            type: AppMessageType.Result,
            value: --this.counter,
          }),
        ];
      case AppMessageType.Destroy:
        return [HandlerAction.Kill(context.self())];
      default:
        return null;
    }
  }
}
```

### Actor Lifecycle
```typescript
const scheduler = new AsyncScheduler<AppMessage>((output) => new CounterActor(output));

// Spawn actor and send messages
scheduler.dispatch({ type: AppMessageType.Increment });
const result = await scheduler.next();
// result = { done: false, value: { type: AppMessageType.Result, value: 1 } }

// Cleanup
scheduler.dispatch({ type: AppMessageType.Destroy });
const final = await scheduler.next();
// final = { done: true, value: null }
```

### Actor Supervision
```typescript
class SupervisorActor implements Actor<AppMessage> {
  private child: ActorHandle<AppMessage>;
  
  public handle(
    message: AppMessage,
    context: HandlerContext<AppMessage>,
  ): HandlerResult<AppMessage> {
    switch (message.type) {
      case AppMessageType.Destroy:
        // Clean up child actor
        return [HandlerAction.Kill(this.child)];
      default:
        // Forward message to child
        return [HandlerAction.Send(this.child, message)];
    }
  }
}
```

### Scripted Workers
Scripted Workers provide a declarative way to define actor behavior, especially for complex interaction patterns and timed sequences. They use a set of combinator functions to build a behavior tree that is executed by a lightweight virtual machine.

```typescript
import { act, send, delay, sequence } from '@reactive-kit/scripted-workers'; // (Illustrative import)

interface MyMessage { type: "HELLO" | "GOODBYE" };

// Basic scripted worker sending a message after a delay and awaiting a response before terminating
const myScriptedWorker = act<MyMessage>((self, { outbox }) => 
  sequence(({ done }) => [
    delay(100),
    send(outbox, { type: "HELLO" }),
    waitFor(
      (msg) => msg.type === "GOODBYE",
      () => done()
    ),
  ])
);
// This definition can then be used with an actor scheduler.
```

For more details, see the [Scripted Workers](../packages/scripted-workers/SPEC.md) specification.

## Related Specs
- [Dual Realm Architecture](./dual-realm-architecture.spec.md)
- [Dependency Tracking](./dependency-tracking.spec.md)
- [Runtime Scheduler](./runtime-scheduler.spec.md)
- [Plugin Architecture](./plugin-architecture.spec.md)
- [Scripted Workers](../packages/scripted-workers/SPEC.md)
