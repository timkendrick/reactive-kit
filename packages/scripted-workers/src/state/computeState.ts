import {
  createComputeStateValueResolver,
  type ComputeStateValueResolver,
  type ValueRef,
} from '../types';

/**
 * Creates a `ComputeStateValueResolver` for a derived value `R`. It takes a tuple of `ValueRef`s
 * and a `combine` function.
 *
 * @template S - A tuple type representing the types of the states managed by the input `inputs`.
 * @template V - The type of the value returned by the `combine` function and resolved value.
 * @param inputs - A read-only array (tuple) of `ValueRef`s.
 * @param combine - A function that takes the resolved values of the states and returns a computed value `R`.
 * @returns An opaque resolver object.
 */
export function computeState<S extends Array<unknown>, V>(
  inputs: { [K in keyof S]: ValueRef<S[K]> },
  combine: (...values: S) => V,
): ComputeStateValueResolver<S, V> {
  return createComputeStateValueResolver(inputs, combine);
}
