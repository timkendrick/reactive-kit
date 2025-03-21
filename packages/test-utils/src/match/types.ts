/**
 * Pattern matcher that can consume elements from an input array
 * and return information about possible matches.
 *
 * Matchers can return multiple possible match results to allow for backtracking,
 * and can be composed to create more complex patterns.
 */
export interface Pattern<T> {
  /**
   * Attempt to match a pattern starting at the given position
   * @param state The current match state
   * @returns All possible match results
   */
  match(state: MatchState<T>): Array<MatchState<T>>;
}

/**
 * Represents a single possible match result from a pattern matcher
 */
export interface MatchState<T> {
  /** Input array to match against */
  input: Array<T>;
  /** Index of the next element in the input array to be matched, or null if no match was found */
  nextIndex: number;
  /** Captured sub-sequences from the input */
  refContext: Map<RefHandle<unknown>, unknown>;
}

declare const RefTypeTag: unique symbol;

export type RefHandle<T> = symbol & {
  readonly [RefTypeTag]: T;
};

export type PatternMatchResults<T> = Array<MatchState<T>>;

/**
 * Helper type for simple predicates that match a single element
 */
export interface Predicate<T> {
  (value: T): boolean;
}

/**
 * Helper type for type narrowing predicates that match a single element
 */
export interface TypeNarrowingPredicate<I, O extends I> extends Predicate<I> {
  (value: I): value is O;
}
