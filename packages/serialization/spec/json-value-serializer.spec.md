# JSON value serializer

## Overview

This proposal extends the `@reactive-kit/serialization` package, providing serialization logic for encoding values as JSON strings.

Two concrete serializer classes will be provided:

1.  **`JsonSerializer`**: A standard serializer that handles all native JSON data types. It includes essential features like customizable fallback handling for unsupported types and robust detection and management of cyclical object references.

2.  **`ExtendedJsonSerializer`**: A more powerful serializer that extends `JsonSerializer`. This opinonated wrapper allows encoding a wider range of common JavaScript types that are not natively supported by JSON, such as `bigint`, `Date`, `Map`, `Set` and `ArrayBuffer`, as well as a mechanism for encoding arbitrary `function` and `symbol` types.

## Motivation

ReactiveKit uses the extensible `@reactive-kit/serialization` package as a foundational building block for serializing values.

A common use case for serialization is serializing values to JSON strings. Whether for logging, tracing, persistence, or debugging, JSON is a common widely-supported serialization target.

While JavaScript provides a native `JSON.stringify` function, it has several limitations that make it insufficient for the needs of ReactiveKit:

*   **Limited Type Support**: The JSON standard only supports a small subset of JavaScript's built-in types. `JSON.stringify` silently omits `function` and `symbol` values, and throws errors for `bigint`. Other common types like `Date`, `Map`, `Set`, and `ArrayBuffer` are not serialized in a way that preserves their type information.
*   **Cumbersome Extensibility**: While the `replacer` argument allows for custom serialization logic, managing this for a large number of custom types and edge cases can quickly become complex and error-prone.
*   **Poor Cycle Handling**: Cyclical references throw an unrecoverable `TypeError`, with no built-in mechanism to gracefully handle or customize this behavior.

This proposal introduces dedicated serializers to address these shortcomings.

## API Details

### `JsonSerializer`

This class provides serialization for standard JavaScript types that are natively supported by the JSON format. It offers hooks for handling unsupported types and cyclical references.

> Note that this API relies on the "JSON.parse source text access" TC39 proposal ([Stage 3](https://tc39.es/proposal-json-parse-with-source/) at time of writing)

```typescript
/**
 * Raw JSON token, as specified in https://github.com/tc39/proposal-json-parse-with-source
 */
export interface RawJSON {
  readonly rawJSON: string;
}

export declare class JsonSerializer implements Serializer<unknown, string> {
  public constructor(options: {
    fallback: (value: unknown) => RawJSON | unknown;
    onCycle?: (value: object) => RawJSON | null;
  });
  public serialize(value: unknown): string;
}
```

Under the hood, this generates a corresponding `replacer` argument for `JSON.stringify`. This allows for custom serialization of any value that is not natively supported by `JSON.stringify`. The `replacer` implementation reads the original property value from the object before any potential `toJSON()` transformation by `JSON.stringify`, ensuring the `fallback` receives the untransformed value rather than the coerced value.

It's important to note:
-   `undefined` values are handled directly by `JSON.stringify` before the `fallback` is ever called. Object properties with `undefined` values are omitted, and `undefined` within an array is converted to `null`.
-   The value returned by the `fallback` can be a `RawJSON` token, which is inserted directly into the JSON output, or any other value that will then be recursively processed by the serializer, ensuring correctly-encoded JSON output.
-   The `fallback` is only invoked for values that are not considered "plain" JSON types (i.e., primitives, plain objects, and arrays). Class instances and other complex objects will be passed to the `fallback`.

**Example:**
```typescript
const serializer = new JsonSerializer({
  fallback: (value) => {
    // Return a numeric JSON value for BigInts
    if (typeof value === 'bigint') return JSON.rawJSON(value.toString());
    // Return a placeholder JSON string for other types
    if (typeof value === 'symbol') return JSON.rawJSON('"<Unsupported Type>"');
    // For a custom class, return a serializable object
    if (value instanceof MyClass) return { custom: value.toString() };
    return null;
  },
});

serializer.serialize({ a: 1, b: 123n, c: Symbol('foo') });
// Expected output: '{"a":1,"b":123,"c":"<Unsupported Type>"}'
```

#### Cycle Detection and Handling

To optimize for the common case where objects do not contain cycles, serialization is attempted first without cycle detection overhead. Cycles are handled using a two-pass strategy when a `TypeError` or `RangeError` is encountered in the first pass.

1.  The serializer first attempts to call the native `JSON.stringify` with a `replacer` function derived from the `fallback` options.
2.  If this call throws a `TypeError` (e.g., "converting circular structure to JSON") or a `RangeError` (e.g., "Maximum call stack size exceeded", which can happen when processing recursive fallback structures), it is flagged as a potential cyclical reference.
    *   If the `onCycle` callback is not provided, the error is immediately re-thrown.
    *   If `onCycle` is provided, the serializer performs a second pass. This time, it uses a different `replacer` function that traverses the object graph while keeping track of visited nodes in a `Set`.
3.  During the second pass:
    *   If a cycle is detected, the `replacer` passes the object that is the root of the cycle to the `onCycle` callback.
        *   If `onCycle` returns a `RawJSON` token, that token is used as the serialized representation for the cycle, and serialization continues.
        *   If `onCycle` returns `null`, the original `TypeError` is re-thrown.
    *   If the traversal completes and no cycle is found (meaning the initial `TypeError` was thrown for a different reason, such as from a misbehaving `toJSON` method), the original `TypeError` is re-thrown.

### `ExtendedJsonSerializer`

The `ExtendedJsonSerializer` will internally use an instance of `JsonSerializer`, providing a custom `fallback` function that implements the logic for serializing extended types.

```typescript
export declare class ExtendedJsonSerializer implements Serializer<unknown, string> {
  public constructor(options: {
    getFunctionId: (value: Function) => bigint;
    getSymbolId: (value: symbol) => bigint;
    fallback: (value: object) => RawJSON | unknown;
    onCycle?: (value: object) => RawJSON | null;
  });
  public serialize(value: unknown): string;
}
```

The `ExtendedJsonSerializer` handles a set of common JavaScript types (`bigint`, `Date`, `Map`, `Set`, `ArrayBuffer`, `function`, `symbol`) with built-in serialization logic. For any type not explicitly handled by these built-in rules, the provided `fallback` function is invoked to determine the serialization behavior.

If the `onCycle` handler is provided, it will be passed to the underlying `JsonSerializer` instance.

#### Extended Type Encodings

*   **`bigint`**:
    *   Serializes directly to its numeric literal representation with a negative double-zero exponent. This is a valid JSON number format which would not be encountered accidentally, due to the negative exponent with a leading zero.
    *   Example: `123n` becomes `123e-00`.
    *   > **Note**: This compact format is a deliberate performance optimization. `bigint` values are prevalent in ReactiveKit (e.g., for hashes), so for performance reasons we avoid the overhead of object wrappers for such a frequent type. A standard `JSON.parse` will deserialize this to the number `123`.

*   **`function`**:
    *   Format: `{ "__type": "function", "value": 123e-00 }`
    *   The `value` is the `bigint` ID obtained from the `getFunctionId` callback, serialized using the special `bigint` numeric format.
 is beneficial
*   **`symbol`**:
    *   Format: `{ "__type": "symbol", "value": 123e-00 }`
    *   The `value` is the `bigint` ID obtained from the `getSymbolId` callback, also serialized in the special `bigint` numeric format.

*   **`Date`**:
    *   Format: `{ "__type": "Date", "value": "2024-01-01T00:00:00.000Z" }`
    *   The `value` is the standard ISO 8601 string representation of the date, specified to millisecond precision with the `Z` timezone. Invalid dates are serialized as `null`.

*   **`Map`**:
    *   Format: `{ "__type": "Map", "value": [["key:1", "value:1"], ["key:2", "value:2"]] }`
    *   The `value` is an array of `[key, value]` pairs. Both keys and values are recursively serialized.

*   **`Set`**:
    *   Format: `{ "__type": "Set", "value": ["value1", "value2"] }`
    *   The `value` is an array of the set's members, which are recursively serialized.

*   **`ArrayBuffer`**:
    *   Format: `{ "__type": "ArrayBuffer", "value": "SGVsbG8sIHdvcmxkIQ==" }`
    *   The `value` is a Base64-encoded string representation of the buffer's contents.
    *   > **Note**: Encoding uses the global `btoa` function, which is widely available in modern browsers and in Node.js environments. This could change once the [Uint8Array to/from base64](https://tc39.es/proposal-arraybuffer-base64/spec/) TC39 proposal is standardized.

> Note: The consumer is responsible for providing stable, unique identifiers for functions and symbols via the `getFunctionId` and `getSymbolId` callbacks. If stable references are required across serialization boundaries, the consumer must manage a persistent mapping.

#### Error Handling

*   If the `getFunctionId` or `getSymbolId` callbacks throw an error for a given value, that error will not be caught by the serializer and will propagate up the call stack.

## Usage Examples

### Basic `JsonSerializer` Usage

This example demonstrates how to use `JsonSerializer` with a custom fallback for unsupported types.

```typescript
import { JsonSerializer } from '@reactive-kit/serialization';

const serializer = new JsonSerializer({
  fallback: (value) => {
    // Serialize RegExp objects into a custom string format
    if (value instanceof RegExp) return JSON.rawJSON(`"/${value.source}/${value.flags}"`);
    // For all other unsupported types, return a placeholder
    return JSON.rawJSON(`"[Unsupported Type]"`);
  },
});

const data = {
  id: 123,
  pattern: /foo/i,
  unsupported: () => {},
};

const json = serializer.serialize(data);

// Expected output:
// '{"id":123,"pattern":"/foo/i","unsupported":"[Unsupported Type]"}'
console.log(json);
```

### `JsonSerializer` with Cycle Handling

This example shows how to handle cyclical references gracefully using the `onCycle` callback.

```typescript
import { JsonSerializer } from '@reactive-kit/serialization';

const serializer = new JsonSerializer({
  fallback: () => JSON.rawJSON('"[Unsupported Type]"'),
  onCycle: (cycleRoot) => {
    // Return a placeholder for any object that causes a cycle
    return JSON.rawJSON(`"[Circular: ${cycleRoot.constructor.name}]"`);
  },
});

const a: Record<string, any> = { name: 'a' };
const b = { name: 'b', a: a };
a.b = b; // Create a cycle: a -> b -> a

const json = serializer.serialize(a);

// Expected output:
// '{"name":"a","b":{"name":"b","a":"[Circular: Object]"}}'
console.log(json);
```

### `ExtendedJsonSerializer` Usage

This example demonstrates the out-of-the-box capabilities of `ExtendedJsonSerializer` for handling various JavaScript types.

```typescript
import { ExtendedJsonSerializer } from '@reactive-kit/serialization';

// In a real application, these would be robust ID generation functions.
const functionIds = new Map<Function, bigint>();
let nextFunctionId = 0n;
const getFunctionId = (fn: Function) => {
  if (!functionIds.has(fn)) {
    functionIds.set(fn, nextFunctionId++);
  }
  return functionIds.get(fn)!;
};

const serializer = new ExtendedJsonSerializer({
  getFunctionId: getFunctionId,
  getSymbolId: (sym) => Symbol.keyFor(sym) ? BigInt(Symbol.keyFor(sym)!.length) : -1n,
  fallback: (value) => {
    // Custom fallback for types not handled by ExtendedJsonSerializer
    if (value instanceof RegExp) return { __type: 'RegExp', source: value.source, flags: value.flags };
    // For all other unsupported types, return null
    return null;
  },
});

const myCallback = () => console.log('hello');

const data = {
  id: 12345n,
  createdAt: new Date('2024-01-01T12:00:00.000Z'),
  metadata: new Map([['key:1', 'value:1'], ['key:2', 'value:2']]),
  tags: new Set(['a', 'b']),
  action: myCallback,
  anotherAction: myCallback, // Same function, should have same ID
};

const json = serializer.serialize(data);

// Expected output (pretty-printed for readability):
// {
//   "id": 12345e-00,
//   "createdAt": { "__type": "Date", "value": "2024-01-01T12:00:00.000Z" },
//   "metadata": { "__type": "Map", "value": [["key:1", "value:1"], ["key:2", "value:2"]] },
//   "tags": { "__type": "Set", "value": ["a", "b"] },
//   "action": { "__type": "function", "value": 0e-00 },
//   "anotherAction": { "__type": "function", "value": 0e-00 }
// }
console.log(JSON.stringify(JSON.parse(json), null, 2));
``` 
