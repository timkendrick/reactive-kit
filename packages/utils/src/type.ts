export function nonNull<T>(value: T): value is NonNullable<T> {
  return value != null;
}

export function unreachable(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

export function noop(): void {}

const PHANTOM_TYPE: unique symbol = undefined as never;

export interface PhantomType<T> {
  [PHANTOM_TYPE]: T;
}

export function PhantomType<T>(): PhantomType<T> {
  return undefined as never;
}
