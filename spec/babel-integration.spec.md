# Babel Integration

## Overview
The Babel Integration component provides the necessary Babel plugins and transforms to convert JavaScript/TypeScript code into reactive functions. It builds on top of Babel's plugin system and the Regenerator transform to handle async/await syntax and generator functions.

At compile-time, the Babel Integration uses the Regenerator transform to convert async/await syntax into generator functions. However, at runtime, we provide a custom Regenerator runtime context (`AsyncGeneratorContext`) that integrates with the reactive functions interpreter. This custom context:

- Manages generator state and control flow
- Handles try/catch blocks and error propagation
- Integrates with the reactive function evaluation model
- Provides deterministic execution guarantees
- Supports dependency tracking and caching

This separation allows us to leverage Regenerator's proven transformation logic while maintaining control over the runtime behavior to ensure deterministic evaluation and proper integration with the reactive system.

## Background: How Regenerator Works

Regenerator is a Babel transform that converts async/await syntax into ES5 generator functions. The transformation process involves:

1. **State Machine Generation**
   - Converts async functions into generator functions
   - Creates a state machine to track execution progress
   - Handles control flow transitions between states
   - Manages try/catch blocks and error handling

2. **Context Management**
   - Creates a generator context to maintain state
   - Tracks local variables and function parameters
   - Manages the generator's internal state (prev/next)
   - Handles completion records and error states

3. **Control Flow**
   - Converts await expressions into yield statements
   - Manages generator resumption and completion
   - Handles try/catch/finally blocks
   - Supports async iteration and yield expressions

Our custom runtime context (`AsyncGeneratorContext`) extends this model by:
- Integrating with the reactive evaluation model
- Adding deterministic execution guarantees
- Supporting dependency tracking
- Managing reactive state transitions

## Examples

### Plugin Configuration
```javascript
// babel.config.js
module.exports = {
  plugins: [
    '@reactive-kit/babel-plugin-reactive-functions',
    '@reactive-kit/babel-plugin-reactive-jsx'
  ]
};
```

### Symbol Definitions
```typescript
// Well-known symbols used in transformations
const SYMBOLS = {
  HASH: Symbol.for('@reactive-kit/symbols/hash'),
  TYPE: Symbol.for('@reactive-kit/symbols/type'),
  TYPE_GENERATOR: Symbol.for('@reactive-kit/symbols/type/generator'),
  TYPE_EXPRESSION: Symbol.for('@reactive-kit/symbols/type/expression'),
  EXPRESSION_TYPE: Symbol.for('@reactive-kit/symbols/expression/type'),
  EXPRESSION_TYPE_ASYNC: Symbol.for('@reactive-kit/symbols/expression/type/async')
};
```

### AST Transformation
```typescript
// Example of AST transformation for async functions
function transformAsyncFunction(path: NodePath<t.FunctionDeclaration>) {
  const { node, scope } = path;
  if (!node.async || node.generator) return;

  // Apply Regenerator transform
  const regenerator = regeneratorTransform(babel);
  traverse(node, regenerator.visitor, scope);

  // Add reactive function metadata
  addFunctionMetadata(path);
}
```

### Generator State Machine
```typescript
// Example of a transformed async function
async function fetchUser(id: string) {
  const user = await fetch(`/api/users/${id}`);
  const posts = await fetch(`/api/users/${id}/posts`);
  return { user, posts };
}

// Transformed into a generator function
function fetchUser$(context) {
  while (1) switch (context.state.prev = context.state.next) {
    case 0:
      context.state.next = 2;
      return context.yield(fetch(`/api/users/${context.state.args.id}`));
    case 2:
      context.state.locals.user = context.sent;
      context.state.next = 4;
      return context.yield(fetch(`/api/users/${context.state.args.id}/posts`));
    case 4:
      context.state.locals.posts = context.sent;
      return context.abrupt("return", {
        user: context.state.locals.user,
        posts: context.state.locals.posts
      });
    case 6:
    case "end":
      return context.stop();
  }
}
```

### Custom Runtime Context
```typescript
// Example of our custom AsyncGeneratorContext
class AsyncGeneratorContext<T> {
  constructor(expression: AsyncExpression<T>, state: GeneratorState) {
    this.generator = expression;
    this.state = createMutableGeneratorState(state);
    this.tryEntries = this.createTryEntries();
  }

  next(sent: GeneratorContinuation | null) {
    // Handle generator state transitions
    while (true) {
      switch (this.method) {
        case IteratorMethod.Next:
          this.sent = this.arg;
          break;
        case IteratorMethod.Throw:
          if (this.state === GenState.SuspendedStart) {
            this.state = GenState.Completed;
            throw this.arg;
          }
          this.dispatchException(this.arg);
          break;
        case IteratorMethod.Return:
          this.abrupt("return", this.arg);
          break;
      }

      // Execute the generator function
      const record = tryCatch(this.generator.target, this);
      if (record.success) {
        // Handle successful execution
        this.state = this.done ? GenState.Completed : GenState.SuspendedYield;
        if (this.done) {
          return { done: true, value: record.value };
        }
        return { done: false, value: record.value };
      }
    }
  }

  yield(value: unknown) {
    // Create a suspense expression for reactive evaluation
    return createSuspense(
      [wrapExpression(value)],
      this.generator,
      assignGeneratorStateHash(this.state, null)
    );
  }
}
```

### Integration with Interpreter
```typescript
// Example of how the interpreter uses our custom context
function evaluateAsyncExpression<T>(
  expression: AsyncExpression<T>,
  state: SuspenseState,
  continuation: GeneratorContinuation | null
): Expression<T> | SuspenseExpression<T> {
  // Create our custom context
  const context = new AsyncGeneratorContext(expression, state);
  
  // Execute the generator
  const result = context.next(continuation);
  
  if (result.done) {
    return result.value;
  }
  
  // Handle suspense expressions
  return result.value;
}
```

## Related Specs
- [Dual Realm Architecture](./dual-realm-architecture.spec.md)
- [Runtime Scheduler](./runtime-scheduler.spec.md)
- [Interpreter](./interpreter.spec.md)
- [Compiler](./compiler.spec.md)
- [Dependency Tracking](./dependency-tracking.spec.md) 
