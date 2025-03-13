# Dependency Tracking

## Overview
The Dependency Tracking system is a core component of Reactive Kit that enables fine-grained reactivity by automatically tracking dependencies between reactive functions and their inputs. This system ensures that computations are only re-run when their dependencies change, while maintaining complete causal chains across system boundaries.

## Examples

### Basic Dependency Tracking
```typescript
import { useTime } from '@reactive-kit/hooks';

async function clock() {
  // Dependencies are automatically tracked
  const timestamp = await useTime({ interval: 1000 });
  const millis = timestamp.getTime();
  return `Current UNIX time: ${Math.floor(millis / 1000)}`;
}
```

### Nested Dependencies
```typescript
import { useWatchFile } from '@reactive-kit/hooks';

async function config() {
  // Dependencies are tracked through nested calls
  const settings = await useWatchFile('/config.json');
  return JSON.parse(settings);
}

async function app() {
  // Dependencies from config() are tracked
  const config = await config();
  return `App version: ${config.version}`;
}
```

### Dynamic Dependencies
```typescript
import { useTime } from '@reactive-kit/hooks';

async function dynamicClock(interval: number) {
  // Dependencies can change based on parameters
  const timestamp = await useTime({ interval });
  return timestamp;
}

async function main() {
  // Dependencies update when parameters change
  const time1 = await dynamicClock(1000);
  const time2 = await dynamicClock(500);
  return { time1, time2 };
}
```

> Note: Cross-boundary dependency tracking (e.g., between different services or processes) will be handled by a distributed tracing layer. The specific mechanism for this is TBD and will be specified in a separate document.

## Related Specs
- [Dual Realm Architecture](./dual-realm-architecture.spec.md)
- [Actor System](./actor-system.spec.md)
- [Runtime Scheduler](./runtime-scheduler.spec.md)
- [Compiler](./compiler.spec.md) 
