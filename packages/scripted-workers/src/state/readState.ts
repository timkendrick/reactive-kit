import { createReadStateValueResolver, type ReadStateValueResolver, type ValueRef } from '../types';

/**
 * Creates a `ReadStateValueResolver`. This is not a command itself, but a helper to produce
 * a placeholder that is dynamically resolved at runtime to retrieve a value from state.
 * This resolved value is then used as an argument to another command (e.g., `send`, `delay`).
 *
 * @template S - The type of the state being read from.
 * @template V - The type of the value selected from the state.
 * @param input - The handle to the state from which to read.
 * @param selector - A function that takes the current state `S` and returns a selected value `V`.
 * @returns An opaque resolver object.
 */
export function readState<S, V>(
  input: ValueRef<S>,
  selector: (currentState: S) => V,
): ReadStateValueResolver<S, V> {
  return createReadStateValueResolver(input, selector);
}
