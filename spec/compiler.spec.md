# Compiler

## Overview
The Compiler is a core component of Reactive Kit that transforms JavaScript/TypeScript code into reactive functions. It provides a set of Babel plugins that handle the transformation of async functions and JSX into reactive expressions, enabling deterministic evaluation and efficient dependency tracking.

The compiler relies heavily on the Regenerator babel transform to handle the transformation of async functions into generator functions. Regenerator provides the core functionality for:
- Converting async/await syntax into generator functions
- Managing generator state and control flow
- Handling try/catch blocks and error propagation
- Supporting async iteration and yield expressions

For detailed information about the Babel integration and Regenerator internals, see the [Babel Integration](./babel-integration.spec.md) specification.

## Requirements

### Core Functionality
1. Async Function Transformation
   - Must transform async functions into reactive expressions
   - Must handle generator state management
   - Must preserve function parameters and scope
   - Must support nested async functions
   - Must handle function hoisting

2. JSX Transformation
   - Must transform JSX elements into function calls
   - Must handle JSX fragments and expressions
   - Must support custom elements
   - Must preserve props and attributes
   - Must handle async JSX contexts

3. Symbol Management
   - Must add type symbols to expressions
   - Must add hash symbols for caching
   - Must add generator metadata
   - Must preserve symbol context
   - Must handle symbol collisions

4. Code Generation
   - Must generate valid JavaScript
   - Must preserve source maps
   - Must handle error locations
   - Must support incremental compilation
   - Must optimize generated code

### Type System Integration
1. Type Safety
   - Must preserve TypeScript types
   - Must handle generic types
   - Must support type inference
   - Must validate type constraints
   - Must handle type declarations

2. Expression Types
   - Must define expression interfaces
   - Must handle type composition
   - Must support type narrowing
   - Must preserve type information
   - Must enable type checking

### Performance Requirements
1. Compilation Speed
   - Must minimize transformation overhead
   - Must optimize AST traversal
   - Must handle large codebases
   - Must support incremental updates
   - Must enable parallel processing

2. Code Quality
   - Must generate efficient code
   - Must minimize runtime overhead
   - Must optimize memory usage
   - Must handle code splitting
   - Must support tree shaking

## Examples

### Async Function Transformation
```typescript
// Input
async function map(expression, transform) {
  const value = await expression;
  return transform(value);
}

// Output
function map$(_context) {
  while (1) switch (_context.state.prev = _context.state.next) {
    case 0:
      _context.state.next = 2;
      return _context["yield"](_context.state.args.expression);
    case 2:
      _context.state.locals.value = _context.sent;
      return _context.abrupt("return", _context.state.args.transform(_context.state.locals.value));
    case 4:
    case 0x1fffffffffffff:
    default:
      return _context.stop();
  }
}

map$[Symbol.for("@reactive-kit/symbols/hash")] = (_hash) => _hash("@reactive-kit/symbols/type/generator", hash)
map$[Symbol.for("@reactive-kit/symbols/type")] = Symbol.for("@reactive-kit/symbols/type/generator")
map$[Symbol.for("@reactive-kit/symbols/generator")] = {
  params: ["expression", "transform"],
  locals: ["value"],
  intermediates: [],
  statics: [],
  tryLocsList: null
};

function map(expression, transform) {
  return {
    [Symbol.for("@reactive-kit/symbols/hash")]: (_hash) => _hash("@reactive-kit/symbols/expression/type/async", hash, expression, transform),
    [Symbol.for("@reactive-kit/symbols/type")]: Symbol.for("@reactive-kit/symbols/type/expression"),
    [Symbol.for("@reactive-kit/symbols/expression/type")]: Symbol.for("@reactive-kit/symbols/expression/type/async"),
    target: map$,
    args: [expression, transform]
  };
}
```

### JSX Transformation
```typescript
// Input
function Component() {
  return <div id="foo">Hello</div>;
}

// Output
function Component() {
  return div({ "id": "foo" }, "Hello");
}
```

## Related Specs
- [Dual Realm Architecture](./dual-realm-architecture.spec.md)
- [Runtime Scheduler](./runtime-scheduler.spec.md)
- [Interpreter](./interpreter.spec.md)
- [Dependency Tracking](./dependency-tracking.spec.md) 
