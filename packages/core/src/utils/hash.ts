// FIXME: Allow user-assigned hash functions
export type Hashable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<Hashable>
  | { [key: string]: Hashable }
  | { [HASH](state: bigint): bigint };

export const HASH: unique symbol = Symbol.for('@trigger::hash');

const HASH_BITS = 64;
const HASH_SEED = 14_695_981_039_346_656_037n;
const HASH_STEP = 1_099_511_628_211n;

const STRING_ENCODER = new TextEncoder();

export function hash(...values: Array<Hashable>): bigint {
  return values.reduce(writeValueHash, HASH_SEED);
}

function writeByteHash(state: bigint, byte: number): bigint {
  return BigInt.asUintN(HASH_BITS, (state ^ BigInt(byte)) * HASH_STEP);
}

function writeUint8ArrayHash(state: bigint, value: Uint8Array): bigint {
  state = writeByteHash(state, value.length);
  for (const byte of value) {
    state = writeByteHash(state, byte);
  }
  return state;
}

function writeValueHash(state: bigint, value: Hashable): bigint {
  if (value == null) return writeNullHash(writeByteHash(state, 0));
  switch (typeof value) {
    case 'undefined':
      return writeUndefinedHash(writeByteHash(state, 1));
    case 'boolean':
      return writeBooleanHash(writeByteHash(state, 2), value);
    case 'number':
      return writeNumberHash(writeByteHash(state, 3), value);
    case 'string':
      return writeStringHash(writeByteHash(state, 4), value);
    case 'object':
      if (Array.isArray(value)) return writeArrayHash(writeByteHash(state, 5), value);
      if (HASH in value) return value[HASH](writeByteHash(state, 6));
      return writeObjectHash(writeByteHash(state, 7), value);
    default:
      throw new Error(`Unable to hash value: ${value}`);
  }
}

function writeNullHash(state: bigint): bigint {
  return state;
}

function writeUndefinedHash(state: bigint): bigint {
  return state;
}

function writeBooleanHash(state: bigint, value: boolean): bigint {
  return writeByteHash(state, value ? 1 : 0);
}

function writeStringHash(state: bigint, value: string): bigint {
  const bytes = STRING_ENCODER.encode(value);
  return writeUint8ArrayHash(state, bytes);
}

function writeNumberHash(state: bigint, value: number): bigint {
  const serializer = new Float64Array(1);
  serializer[0] = value;
  const view = new DataView(serializer.buffer);
  state = writeByteHash(state, view.getUint8(0));
  state = writeByteHash(state, view.getUint8(1));
  state = writeByteHash(state, view.getUint8(2));
  state = writeByteHash(state, view.getUint8(3));
  return state;
}

function writeArrayHash(state: bigint, value: Array<Hashable>): bigint {
  state = writeByteHash(state, value.length);
  for (const item of value) {
    state = writeValueHash(state, item);
  }
  return state;
}

function writeObjectHash(state: bigint, value: { [key: string]: Hashable }): bigint {
  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  state = writeByteHash(state, entries.length);
  for (const [key, value] of entries) {
    state = writeStringHash(state, key);
    state = writeValueHash(state, value);
  }
  return state;
}
