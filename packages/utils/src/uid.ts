/// <reference lib="dom" />

export type Uid = bigint;

export function generateUid(): Uid {
  return globalThis.crypto.getRandomValues(new BigUint64Array(1))[0];
}
