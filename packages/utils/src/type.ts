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

/**
 * Determine whether the two given types are equal.
 */
export type IsEqual<A, B> =
  (<T>() => T extends (A & T) | T ? 1 : 2) extends <T>() => T extends (B & T) | T ? 1 : 2
    ? true
    : false;

/**
 * Simplify a compound intersection type for better readability
 * @example
 * type Complex = { a: { b: string } } & { c: number };
 * type Simple = Simplify<Complex>;
 * // type Complex = { a: { b: string } } & { c: number }
 * // type Simple = { a: { b: string }, c: number }
 */
export type Simplify<A> = {
  [K in keyof A]: A[K];
} extends infer B
  ? B
  : never;
