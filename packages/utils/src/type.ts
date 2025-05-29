export function nonNull<T>(value: T): value is NonNullable<T> {
  return value != null;
}

export function unreachable(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

export function noop(): void {}

/**
 * Base Opaque Type using Branding
 *
 * This utility type helps create nominal types (opaque types)
 * @template T The type to be branded
 * @template B The brand identifier
 */
export type Brand<T, B> = T & { readonly [BRAND]: B };

declare const BRAND: unique symbol;

/**
 * Determine whether the two given types are equal.
 */
export type IsEqual<A, B> =
  (<T>() => T extends (A & T) | T ? 1 : 2) extends <T>() => T extends (B & T) | T ? 1 : 2
    ? true
    : false;

/**
 * Assert that the given type is true.
 */
export type Assert<T extends true> = Extract<T, true>;

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
