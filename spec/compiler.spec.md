# Compiler

## Overview
The Compiler is a core component of Reactive Kit that transforms JavaScript/TypeScript code into reactive functions. It provides a set of Babel plugins that handle the transformation of async functions and JSX into reactive expressions, enabling deterministic evaluation and efficient dependency tracking.

The compiler relies heavily on the Regenerator babel transform to handle the transformation of async functions into generator functions. Regenerator provides the core functionality for:
- Converting async/await syntax into generator functions
- Managing generator state and control flow
- Handling try/catch blocks and error propagation
- Supporting async iteration and yield expressions

For detailed information about the Babel integration and Regenerator internals, see the [Babel Integration](./babel-integration.spec.md) specification.

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
