import { HASH, Hash, type Hashable } from '@trigger/types';

const HASH_BITS = 64;
const HASH_SEED = 14_695_981_039_346_656_037n;
const HASH_STEP = 1_099_511_628_211n;

const STRING_ENCODER = new TextEncoder();

export function hash(...values: Array<Hashable>): Hash {
  return values.reduce(writeValueHash, HASH_SEED);
}

export function createHasher(value: Hashable): (state: Hash) => Hash {
  const precomputedHash = writeValueHash(HASH_SEED, value);
  return (state: Hash) => (state === HASH_SEED ? precomputedHash : writeValueHash(state, value));
}

function writeByteHash(state: Hash, byte: number): Hash {
  return BigInt.asUintN(HASH_BITS, (state ^ BigInt(byte)) * HASH_STEP);
}

function writeUint8ArrayHash(state: Hash, value: Uint8Array): Hash {
  state = writeByteHash(state, value.length);
  for (const byte of value) {
    state = writeByteHash(state, byte);
  }
  return state;
}

function writeValueHash(state: Hash, value: Hashable): Hash {
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
    case 'bigint':
      return writeBigintHash(writeByteHash(state, 5), value);
    case 'object':
      if (Array.isArray(value)) return writeArrayHash(writeByteHash(state, 6), value);
      if (HASH in value) return value[HASH](writeByteHash(state, 7));
      return writeObjectHash(writeByteHash(state, 8), value);
    default:
      throw new Error(`Unable to hash value: ${value}`);
  }
}

function writeNullHash(state: Hash): Hash {
  return state;
}

function writeUndefinedHash(state: Hash): Hash {
  return state;
}

function writeBooleanHash(state: Hash, value: boolean): Hash {
  return writeByteHash(state, value ? 1 : 0);
}

function writeStringHash(state: Hash, value: string): Hash {
  const bytes = STRING_ENCODER.encode(value);
  return writeUint8ArrayHash(state, bytes);
}

function writeNumberHash(state: Hash, value: number): Hash {
  const serializer = new Float64Array(1);
  serializer[0] = value;
  const view = new DataView(serializer.buffer);
  state = writeByteHash(state, view.getUint8(0));
  state = writeByteHash(state, view.getUint8(1));
  state = writeByteHash(state, view.getUint8(2));
  state = writeByteHash(state, view.getUint8(3));
  return state;
}

function writeBigintHash(state: Hash, value: Hash): Hash {
  const serializer = new BigUint64Array(1);
  serializer[0] = value;
  const view = new DataView(serializer.buffer);
  state = writeByteHash(state, view.getUint8(0));
  state = writeByteHash(state, view.getUint8(1));
  state = writeByteHash(state, view.getUint8(2));
  state = writeByteHash(state, view.getUint8(3));
  state = writeByteHash(state, view.getUint8(4));
  state = writeByteHash(state, view.getUint8(5));
  state = writeByteHash(state, view.getUint8(6));
  state = writeByteHash(state, view.getUint8(7));
  return state;
}

function writeArrayHash(state: Hash, value: Array<Hashable>): Hash {
  state = writeByteHash(state, value.length);
  for (const item of value) {
    state = writeValueHash(state, item);
  }
  return state;
}

function writeObjectHash(state: Hash, value: { [key: string]: Hashable }): Hash {
  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  state = writeByteHash(state, entries.length);
  for (const [key, value] of entries) {
    state = writeStringHash(state, key);
    state = writeValueHash(state, value);
  }
  return state;
}
