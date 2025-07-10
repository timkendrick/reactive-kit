## ReactiveKit serialization tools

This package is designed to provide robust and extensible data serialization capabilities within the ReactiveKit ecosystem.

It is intended to be used as a foundational building block, enabling predictable encoding and decoding rules throughout the ReactiveKit ecosystem.

## Overview

The core of this package is the generic `Serializer<I, O>` interface, which establishes a standard contract for serialization logic.

Concrete encoding/decoding rules are provided via usage-specific implementations of `Serializer<I, O>`.

## API details

### `Serializer<I, O>`

This interface defines the fundamental contract for all serializers in the package.

```typescript
export interface Serializer<I, O> {
  /**
   * Serializes a given value into the output format.
   * @param value The input value to serialize.
   * @returns The serialized output.
   */
  serialize(value: I): O;
}
```
> **Note:** There is no built-in graceful error handling for serialization failures. Attempting to serialize a value that is not supported by the serializer and has no applicable fallback will result in a `TypeError` being thrown.

See additional specifications for details on concrete serialization schemes.
