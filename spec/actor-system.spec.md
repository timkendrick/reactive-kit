# Actor System

## Overview
The Actor System is a core component of Reactive Kit that provides a message-based concurrency model for handling side effects and asynchronous operations. Actors communicate through typed messages and maintain isolated state, enabling deterministic behavior and controlled concurrency.

## Requirements

### Core Functionality
1. Actor Definition
   - Must support typed message handling
   - Must maintain actor isolation
   - Must enable actor lifecycle management
   - Must support actor supervision
   - Must handle actor state

2. Message Handling
   - Must support typed message passing
   - Must enable message routing
   - Must handle message ordering
   - Must support message persistence
   - Must enable message replay

3. Actor Lifecycle
   - Must support actor spawning
   - Must handle actor termination
   - Must manage actor resources
   - Must support actor recovery
   - Must enable actor monitoring

### Type System Integration
1. Type Safety
   - Must provide type-safe message passing
   - Must support generic actor types
   - Must enable type-safe actor handles
   - Must handle type constraints
   - Must support type inference

2. Message Types
   - Must support discriminated unions
   - Must handle message type narrowing
   - Must enable type-safe message routing
   - Must support message type guards
   - Must preserve type information

### Performance Requirements
1. Message Processing
   - Must handle high message throughput
   - Must support message batching
   - Must enable message prioritization
   - Must handle backpressure
   - Must support message filtering

2. Resource Management
   - Must manage actor memory efficiently
   - Must handle actor cleanup
   - Must support resource limits
   - Must enable resource monitoring
   - Must handle resource exhaustion

## Acceptance Criteria

### Functional Requirements
1. Correctness
   - Messages must be delivered reliably
   - Actor state must remain consistent
   - Actor lifecycle must be managed correctly
   - Message ordering must be preserved
   - Errors must be handled properly

2. Completeness
   - All messages must be processed
   - No message loss
   - Complete actor lifecycle
   - Full type safety
   - Complete error handling

### Non-Functional Requirements
1. Performance
   - Low message latency
   - High message throughput
   - Efficient resource usage
   - Scalable actor count
   - Responsive message handling

2. Developer Experience
   - Intuitive actor API
   - Clear error messages
   - Easy debugging
   - Type safety
   - Documentation

## Dependencies
- TypeScript type system
- Runtime scheduler
- Message system
- Plugin system
- Dependency tracking

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

## Related Specs
- [Dual Realm Architecture](./dual-realm-architecture.spec.md)
- [Dependency Tracking](./dependency-tracking.spec.md)
- [Runtime Scheduler](./runtime-scheduler.spec.md)
- [Plugin Architecture](./plugin-architecture.spec.md) 
