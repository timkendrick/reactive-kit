## Predicates

Predicates are functions that match a single item in the input sequence. They return a boolean indicating whether the item matches.

### Core Predicate Types

```typescript
/** Basic predicate interface */
export interface Predicate<T> {
  (value: T): boolean;
}

/** Type narrowing predicate interface */
export interface TypeNarrowingPredicate<I, O extends I> extends Predicate<I> {
  (value: I): value is O;
}
```

### Basic Item Predicates

```typescript
// Match any item
any() // matches any single item

// Exact equality
is(expected) // matches if item === expected

// Deep equality
equals(expected) // matches if item is strucurally equivalent to expected
```

### Logical Combinators

Predicates can be composed using logical operators to create more complex predicates:

```typescript
// Combine predicates with AND
and(
  isNumber,
  isGreaterThan(0)
)

// Combine predicates with OR
or(
  isNumber,
  isString
)

// Negate a predicate
not(isNull)
```

### Structure Inspection

Predicates can inspect nested fields within complex objects:

```typescript
// Match specific fields in an object
hasField("status", is("ready"))

// Match fields with predicate functions
hasField("count", n => n > 0)

// Combine field predicates
and(
  hasField("count", n => n > 0),
  hasField("items", arr => arr.length > 0)
)
```

### Type Narrowing with `and`

The `and` logical combinator plays a role in type narrowing. When used with type guard predicates (functions returning `value is Type`), the `and` combinator allows TypeScript to correctly infer the narrowed type within its scope.

```typescript
interface Circle { kind: "circle"; radius: number; }
interface Square { kind: "square"; sideLength: number; }
type Shape = Circle | Square;

function isCircle(shape: Shape): shape is Circle {
  return shape.kind === "circle"
}

function hasRadius(circle: Circle): boolean {
  return circle.radius !== 0
}

const shapes: Array<Shape> = [/* ... */];

const circlesWithRadius = shapes.filter(
  and(
    isCircle, // Narrows type to Circle for the next predicate
    hasRadius // This predicate can safely assume input is Circle
  )
);
// Type of circlesWithRadius would be Array<Circle>
```

### Handler-Specific Predicates

For predicates specific to testing actor handler actions, see the [Handler Predicates Specification](handler-predicates.spec.md).

## Implementation Details

This section provides a detailed breakdown of each predicate's behavior based on its implementation.

### Basic Item Predicates

*   **`any<T>()`**
    *   **Description:** Always returns `true`, matching any single item regardless of its type or value.
    *   **Matches:**
        ```typescript
        any()(42)
        any()("hello")
        any()(null)
        ```
    *   **Does Not Match:** (Never fails to match)

*   **`is<T>(expected: T)`**
    *   **Description:** Checks for strict equality (`===`) between the input item and the `expected` value.
    *   **Matches:**
        ```typescript
        is(5)(5)
        is("a")("a")
        ```
    *   **Does Not Match:**
        ```typescript
        is(5)("5")
        is({})({}) // (different object references)
        ```

*   **`equals<T>(expected: T)`**
    *   **Description:** Checks for deep structural equality between the input item and the `expected` value using `@reactive-kit/utils`'s `deepEqual`.
    *   **Matches:**
        ```typescript
        equals(5)(5)
        equals({ a: 1 })({ a: 1 })
        ```
    *   **Does Not Match:**
        ```typescript
        equals({ a: 1 })({ a: 2 })
        equals([1])([1, 2])
        ```

### Logical Combinators

*   **`and<T>(...predicates: Array<Predicate<T>>)`**
    *   **Description:** Returns `true` if and only if *all* provided predicates return `true` for the input item. Evaluates predicates sequentially and short-circuits (stops evaluation) on the first `false`.
    *   **Matches:**
        ```typescript
        and(is(5), (n) => n > 0)(5)
        ```
    *   **Does Not Match:**
        ```typescript
        and(is(5), (n) => n < 0)(5) // (second predicate fails)
        ```

*   **`or<T>(...predicates: Array<Predicate<T>>)`**
    *   **Description:** Returns `true` if *at least one* of the provided predicates returns `true` for the input item. Evaluates predicates sequentially and short-circuits (stops evaluation) on the first `true`.
    *   **Matches:**
        ```typescript
        or(is(5), is(10))(5) // (first predicate matches)
        ```
    *   **Does Not Match:**
        ```typescript
        or(is(5), is(10))(7) // (neither predicate matches)
        ```

*   **`not<T>(predicate: Predicate<T>)`**
    *   **Description:** Returns the boolean negation of the result of the provided predicate.
    *   **Matches:**
        ```typescript
        not(is(5))(10) // (`is(5)(10)` is `false`, negated is `true`)
        ```
    *   **Does Not Match:**
        ```typescript
        not(is(5))(5) // (`is(5)(5)` is `true`, negated is `false`)
        ```

### Structure Inspection

*   **`hasField<T extends object, K extends keyof T>(field: K, predicate: Predicate<T[K]>)`**
    *   **Description:** Checks if an object has a specific `field` and applies the given `predicate` to the value of that field.
    *   **Matches:**
        ```typescript
        hasField("a", is(1))({ a: 1, b: 2 })
        ```
    *   **Does Not Match:**
        ```typescript
        hasField("a", is(1))({ a: 2, b: 2 }) // (predicate fails)
        // hasField("c", is(1))({ a: 1 }) -> Runtime Error (field 'c' doesn't exist, assumes field exists)
        ```

### Deferred Execution

*   **`lazy<T>(predicate: Predicate<T>)`**
    *   **Description:** Defers the execution of the inner predicate until the lazy predicate is actually evaluated. Useful for computations that depend on runtime values or previously captured references (see Capture & Reference spec).
    *   **Matches:**
        ```typescript
        let condition = false;
        const checkCondition = lazy((input) => input === condition);
        // Later, before checkCondition is evaluated:
        condition = true;
        checkCondition(true) // Evaluates to true because condition is now true
        ```
    *   **Does Not Match:**
        ```typescript
        let condition = true;
        const checkCondition = lazy((input) => input === condition);
        // Later, before checkCondition is evaluated:
        condition = false;
        checkCondition(true) // Evaluates to false because condition is now false
        ```
