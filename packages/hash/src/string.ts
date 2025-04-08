/// <reference lib="dom" />

export function getStringBytes(value: string): Uint8Array<ArrayBufferLike> {
  return new TextEncoder().encode(value);
}
