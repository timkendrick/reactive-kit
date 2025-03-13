# Interpreter

## Overview
The Interpreter is a core component of Reactive Kit that provides a deterministic evaluation engine for reactive computations. It implements a fiber-based evaluation model that supports both synchronous and asynchronous expressions, with built-in support for effect handling, concurrent evaluation, and result caching.

## Examples

### Basic Evaluation
```typescript
const expression = createResult('foo');
const cache: EvaluationCache = new DependencyGraph();
const interpreter = evaluate(expression, cache);
const result = interpreter.next();
// result = { done: true, value: createEvaluationSuccessResult(createResult('foo')) }
```

### Effect Handling
```typescript
const expression = createEffect<'fetch', string, string>('fetch', 'data');
const cache: EvaluationCache = new DependencyGraph();
const interpreter = evaluate(expression, cache);
const initialResult = interpreter.next();
// initialResult = { done: false, value: createEffect<'fetch', string, string>('fetch', 'data') }
const effectValue = createResult('fetched data');
const result = interpreter.next(effectValue);
// result = { done: true, value: createEvaluationSuccessResult(createResult('fetched data')) }
```

### Concurrent Evaluation
```typescript
const expression = createAsync(async function* (context) {
  const first = yield createEffect<'fetch', string, string>('fetch', 'first');
  const second = yield createEffect<'fetch', string, string>('fetch', 'second');
  return first + second;
});
const cache: EvaluationCache = new DependencyGraph();
const interpreter = evaluate(expression, cache);
// Handles concurrent effects and coordinates results
```

## Related Specs
- [Dual Realm Architecture](./dual-realm-architecture.spec.md)
- [Runtime Scheduler](./runtime-scheduler.spec.md)
- [Actor System](./actor-system.spec.md)
- [Dependency Tracking](./dependency-tracking.spec.md) 
