# Dual Realm Architecture

## Overview
The Dual Realm Architecture is the core design pattern of Reactive Kit, combining synchronous reactive computation with asynchronous message-based actor system. This architecture enables deterministic behavior while maintaining efficient handling of side effects and concurrency.

## Requirements

### Synchronous Realm
1. Pure Computation Layer
   - Must support pure reactive functions
   - Must maintain referential transparency
   - Must enable deterministic output for given inputs
   - Must support fine-grained dependency tracking
   - Must integrate with TypeScript type system

2. Reactive Functions
   - Must support function composition
   - Must enable automatic dependency tracking
   - Must support memoization of computed values
   - Must handle cleanup of stale computations
   - Must support error propagation

3. State Management
   - Must support reactive state variables
   - Must enable computed properties
   - Must support state composition
   - Must handle state updates atomically
   - Must support state cleanup

### Asynchronous Realm
1. Actor System
   - Must implement message-based communication
   - Must support actor isolation
   - Must enable controlled concurrency
   - Must handle actor lifecycle
   - Must support actor supervision

2. Message Handling
   - Must support typed message passing
   - Must enable message routing
   - Must handle message ordering
   - Must support message persistence
   - Must enable message replay

3. Effect Management
   - Must support effect subscriptions
   - Must handle effect cleanup
   - Must enable effect composition
   - Must support effect cancellation
   - Must handle effect errors

### Runtime Coordination
1. Realm Bridge
   - Must coordinate between realms
   - Must maintain causal chains
   - Must handle realm transitions
   - Must support error boundaries
   - Must enable debugging

2. Scheduling
   - Must prioritize synchronous computations
   - Must batch asynchronous operations
   - Must handle backpressure
   - Must support timeouts
   - Must enable cancellation

3. Resource Management
   - Must track active subscriptions
   - Must handle resource cleanup
   - Must support resource limits
   - Must enable resource monitoring
   - Must handle resource errors

## Acceptance Criteria

### Functional Requirements
1. Deterministic Behavior
   - Given the same inputs, synchronous computations must produce identical outputs
   - Message sequences must be deterministic
   - State updates must be atomic and consistent

2. Performance
   - Synchronous computations must be optimized for speed
   - Asynchronous operations must handle backpressure
   - Resource usage must be bounded and predictable

3. Reliability
   - System must handle errors gracefully
   - State must remain consistent
   - Resources must be properly cleaned up

### Non-Functional Requirements
1. Type Safety
   - All interfaces must be fully typed
   - Type inference must be accurate
   - Type errors must be caught at compile time

2. Developer Experience
   - API must be intuitive
   - Error messages must be helpful
   - Debugging must be straightforward

3. Extensibility
   - System must support plugins
   - New effect types must be easy to add
   - Custom actors must be supported

## Dependencies
- TypeScript type system
- Actor system implementation
- Dependency tracking system
- Plugin architecture
- Runtime scheduler

## Examples

### Synchronous Realm Examples

#### File Watching
```typescript
import { useWatchFile } from '@reactive-kit/hooks';

async function greet() {
  const message = await useWatchFile('/motd.txt', {
    encoding: 'utf-8',
  });
  return `Message of the day: ${message}`;
}
```

#### Time-Based Updates
```typescript
import { useTime } from '@reactive-kit/hooks';

async function clock() {
  const timestamp = await useTime({ interval: 1000 });
  const millis = timestamp.getTime();
  return `Current UNIX time: ${Math.floor(millis / 1000)}`;
}
```

#### JSX Rendering
```typescript
import { useTime } from '@reactive-kit/hooks';
import { render } from '@reactive-kit/dom';

async function Main() {
  const timestamp = await useTime({ interval: 1000 });
  const millis = timestamp.getTime();
  return (
    <h1>
      Current UNIX time: <timestamp>{Math.floor(millis / 1000)}</timestamp>
    </h1>
  );
}

render(<Main />, document.body.getElementsByTagName('main')[0]);
```

### Asynchronous Realm Examples

#### Counter Actor
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

#### Actor Lifecycle
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

### Realm Coordination
```typescript
// Combining reactive functions with actors
async function reactiveCounter() {
  // Synchronous realm: UI updates
  const count = await useTime({ interval: 1000 });
  
  // Asynchronous realm: State management
  const actor = createActor({
    onMessage: async (msg) => {
      // Handle state updates
    }
  });
  
  // Realm coordination: Effect cleanup
  return () => {
    actor.destroy();
  };
}
```

## Related Specs
- [Dependency Tracking](./dependency-tracking.spec.md)
- [Actor System](./actor-system.spec.md)
- [Plugin Architecture](./plugin-architecture.spec.md)
- [Runtime Scheduler](./runtime-scheduler.spec.md) 
