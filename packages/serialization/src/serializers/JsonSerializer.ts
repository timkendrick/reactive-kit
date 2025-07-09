import type { Serializer } from '../types/Serializer';
import type { RawJSON } from '../types/json';

export class JsonSerializer implements Serializer<unknown, string> {
  private readonly fallback: (value: unknown) => RawJSON | unknown;
  private readonly onCycle?: (value: object) => RawJSON | null;

  /**
   * Create a JsonSerializer instance
   * @param options Configuration options for the serializer
   */
  public constructor(options: {
    /**
     * A callback function to serialize values that are not native JSON types
     * @param value The unsupported value encountered during serialization
     * @returns JSON-serialized representation of the value
     */
    fallback: (value: unknown) => RawJSON | unknown;
    /**
     * An optional callback to handle cyclical references. If not provided, a
     * `TypeError` will be thrown when a cycle is detected.
     * @param value The object that is the root of the detected cycle
     * @returns JSON-serialized representation of the cyclical reference,
     *          or `null` to re-throw the `TypeError`
     */
    onCycle?: (value: object) => RawJSON | null;
  }) {
    this.fallback = options.fallback;
    this.onCycle = options.onCycle;
  }

  /**
   * Serialize a value to a JSON string
   * @param value The value to serialize
   * @returns The JSON string representation of the value
   */
  public serialize(value: unknown): string {
    // First pass: attempt serialization without cycle detection overhead (fast path)
    const replacer = createReplacer(this.fallback);
    try {
      return JSON.stringify(value, replacer);
    } catch (error) {
      // If we encounter one of the following errors:
      // - TypeError: Converting circular structure to JSON
      // - RangeError Maximum call stack size exceeded
      // this could indicate a cycle in the input object, or an infinite loop when attempting to
      // serialize a custom recursive structure, so we check for cycles
      if ((error instanceof TypeError || error instanceof RangeError) && this.onCycle) {
        // If there is an onCycle handler, re-attempt serialization with cycle detection (slow path)
        return JSON.stringify(value, withCycleDetection(replacer, this.onCycle, error));
      }
      // Otherwise, re-throw the error
      throw error;
    }
  }
}

/**
 * Create a replacer function to be used with `JSON.stringify` to allow custom serialization of non-native types
 * @param fallback Callback to serialize non-native types
 * @returns A `JSON.stringify` replacer function that handles fallback logic
 */
function createReplacer(
  fallback: (value: unknown) => RawJSON | unknown,
): (this: object, key: string, value: unknown) => unknown {
  return function (this: object, key: string, _value: unknown): unknown {
    // Get the value of the property directly from the object, rather than the coerced value
    const propertyValue: unknown = this[key as keyof object];
    // Let JSON.stringify handle native JSON types
    if (isNativeJsonType(propertyValue)) return propertyValue;
    // Use fallback for non-native types
    return fallback(propertyValue);
  };
}

/**
 * Wrap a `JSON.stringify` replacer function to detect and handle cycles
 * @param replacer The `JSON.stringify` replacer function to wrap
 * @param onCycle Callback to handle cycles
 * @param error Error to throw if a cycle is detected and no replacement is provided
 * @returns A new `JSON.stringify` replacer function that detects and handles cycles
 */
function withCycleDetection(
  replacer: (this: object, key: string, value: unknown) => unknown,
  onCycle: (value: object) => RawJSON | null,
  error: TypeError,
): (this: object, key: string, value: unknown) => unknown {
  const visited = new Set<object>();
  return function (this: object, key: string, value: unknown): unknown {
    // Get the value of the property directly from the object, rather than the coerced value
    const propertyValue: unknown = this[key as keyof object];
    // Track objects that could potentially create cycles
    if (propertyValue !== null && typeof propertyValue === 'object') {
      // Check if the value has already been visited (i.e. is part of a cycle)
      if (visited.has(propertyValue)) {
        // Cycle detected - call onCycle handler to obtain a replacement value
        const cycleResult = onCycle(propertyValue);
        // If there is no substitution, re-throw the original TypeError
        if (cycleResult === null) throw error;
        return cycleResult;
      }
      visited.add(propertyValue);
    }
    return replacer.call(this, key, value);
  };
}

/**
 * Check if a value is a native JSON type that doesn't need fallback handling.
 *
 * Note that this only performs a shallow check - arrays and objects are not traversed
 * @param value The value to check
 * @returns True if the value is a native JSON type, false otherwise
 */
function isNativeJsonType(value: unknown): boolean {
  // Native JSON types: string, number, boolean, null, object (including arrays)
  // Note: undefined is handled by JSON.stringify before our replacer is called,
  // so we should let it pass through naturally
  if (value === null) return true;
  if (value === undefined) return true;
  if (typeof value === 'string') return true;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return true;
  if (isPlainObject(value)) return true;
  // Everything else needs fallback handling
  return false;
}

/**
 * Check if a value is a plain object (as opposed to e.g. a class instance)
 * @param value The value to check
 * @returns True if the value is a plain object, false otherwise
 */
function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  if (prototype === null) return true;
  if (prototype === Object.prototype) return true;
  if (Object.getPrototypeOf(prototype) === null) return true;
  return false;
}
