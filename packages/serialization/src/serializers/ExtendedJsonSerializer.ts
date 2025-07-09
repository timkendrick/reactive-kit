import type { Serializer } from '../types/Serializer';
import type { RawJSON } from '../types/json';

import { JsonSerializer } from './JsonSerializer';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type AnyFunction = Function;
type FunctionIdentifier = (value: AnyFunction) => bigint;
type SymbolIdentifier = (value: symbol) => bigint;

export class ExtendedJsonSerializer implements Serializer<unknown, string> {
  private readonly jsonSerializer: JsonSerializer;

  /**
   * Creates an instance of ExtendedJsonSerializer.
   * @param options Configuration options for the serializer.
   */
  public constructor(options: {
    /**
     * A callback that returns a unique, serializable ID for a given function.
     * @param value The function to be identified.
     * @returns A `bigint` representing the unique ID of the function.
     */
    getFunctionId: (value: AnyFunction) => bigint;
    /**
     * A callback that returns a unique, serializable ID for a given symbol.
     * @param value The symbol to be identified.
     * @returns A `bigint` representing the unique ID of the symbol.
     */
    getSymbolId: (value: symbol) => bigint;
    /**
     * An optional callback to handle cyclical references, which is passed to the
     * underlying `JsonSerializer`. If not provided, a `TypeError` will be
     * thrown when a cycle is detected.
     * @param value The object that is the root of the detected cycle.
     * @returns JSON-serialized representation of the cyclical reference,
     *          or `null` to re-throw the `TypeError`.
     */
    onCycle?: (value: object) => RawJSON | null;
  }) {
    const { getFunctionId, getSymbolId, onCycle } = options;
    this.jsonSerializer = new JsonSerializer({
      fallback: createExtendedFallback(getFunctionId, getSymbolId),
      onCycle,
    });
  }

  /**
   * Serializes a value to a JSON string
   * @param value The value to serialize.
   * @returns The JSON string representation of the value.
   */
  public serialize(value: unknown): string {
    return this.jsonSerializer.serialize(value);
  }
}

/**
 * Creates a fallback function that handles extended types.
 */
function createExtendedFallback(
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  getFunctionId: FunctionIdentifier,
  getSymbolId: SymbolIdentifier,
): (value: unknown) => RawJSON | object | null {
  return (value: unknown): RawJSON | object | null => {
    if (typeof value === 'bigint') return serializeBigInt(value);
    if (value instanceof Date) return serializeDate(value);
    if (value instanceof Map) return serializeMap(value);
    if (value instanceof Set) return serializeSet(value);
    if (value instanceof ArrayBuffer) return serializeArrayBuffer(value);
    if (typeof value === 'function') return serializeFunction(value, getFunctionId);
    if (typeof value === 'symbol') return serializeSymbol(getSymbolId, value);
    // For any other unsupported types, return null
    return null;
  };
}

function serializeSymbol(getSymbolId: SymbolIdentifier, value: symbol): object {
  const symbolId = getSymbolId(value);
  return serializeCustomType('symbol', JSON.rawJSON(`${symbolId.toString()}e-00`));
}

function serializeFunction(value: AnyFunction, getFunctionId: FunctionIdentifier): object {
  const functionId = getFunctionId(value);
  return serializeCustomType('function', JSON.rawJSON(`${functionId.toString()}e-00`));
}

function serializeArrayBuffer(value: ArrayBuffer): object {
  // Convert ArrayBuffer to Base64 string
  const uint8Array = new Uint8Array(value);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);
  return serializeCustomType('ArrayBuffer', base64);
}

function serializeMap<K, V>(value: Map<K, V>): object {
  return serializeCustomType('Map', Array.from(value.entries()));
}

function serializeSet<T>(value: Set<T>): object {
  return serializeCustomType('Set', Array.from(value.values()));
}

function serializeBigInt(value: bigint): RawJSON {
  // Serialize to numeric format with magic e-00 exponent marker
  return JSON.rawJSON(`${value.toString()}e-00`);
}

function serializeDate(value: Date): object | null {
  const dateString: string | null = (() => {
    try {
      // Date.toISOString() will throw if the date is invalid
      return value.toISOString();
    } catch {
      return null;
    }
  })();
  // If the date is invalid, return null
  if (dateString === null) return null;
  return serializeCustomType('Date', dateString);
}

function serializeCustomType(type: string, value: RawJSON | unknown): object {
  return { __type: type, value };
}
