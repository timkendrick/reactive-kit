# Runtime Scheduler

## Overview
The Runtime Scheduler is a core component of Reactive Kit that coordinates the execution of reactive functions and actors. It manages the scheduling and execution of tasks across both synchronous and asynchronous realms, ensuring deterministic behavior.

## Examples

### Basic Scheduling
```typescript
const scheduler = new AsyncScheduler<AppMessage>((output) => new CounterActor(output));

// Schedule task and handle result
scheduler.dispatch({ type: AppMessageType.Increment });
const result = await scheduler.next();
// result = { done: false, value: { type: AppMessageType.Result, value: 1 } }
```

### Task Dependencies
```typescript
async function dependentTasks() {
  // First task
  const data = await scheduler.dispatch({ type: AppMessageType.Fetch });
  
  // Second task depends on first
  const processed = await scheduler.dispatch({
    type: AppMessageType.Process,
    data: data.value,
  });
  
  return processed;
}
```

### Task Cleanup
```typescript
async function managedTask() {
  try {
    // Schedule task
    const result = await scheduler.dispatch({ type: AppMessageType.LongRunning });
    return result;
  } finally {
    // Ensure cleanup
    scheduler.dispatch({ type: AppMessageType.Cleanup });
  }
}
```

## Related Specs
- [Dual Realm Architecture](./dual-realm-architecture.spec.md)
- [Dependency Tracking](./dependency-tracking.spec.md)
- [Actor System](./actor-system.spec.md)
- [Plugin Architecture](./plugin-architecture.spec.md) 
