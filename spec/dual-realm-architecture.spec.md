# Dual Realm Architecture

## Overview
The Dual Realm Architecture is the core design pattern of Reactive Kit, combining synchronous reactive computation with asynchronous message-based actor system. This architecture enables deterministic behavior while maintaining efficient handling of side effects and concurrency.

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
