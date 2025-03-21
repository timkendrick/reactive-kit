import { type MatchState, type Pattern, type PatternMatchResults } from './types';

export function matchPattern<T>(input: Array<T>, pattern: Pattern<T>): PatternMatchResults<T> {
  const state: MatchState<T> = initialMatchState<T>(input);
  const results = pattern.match(state);
  return results.filter((result) => result.nextIndex === input.length);
}

export function initialMatchState<T>(input: Array<T>): MatchState<T> {
  return {
    input,
    nextIndex: 0,
    refContext: new Map(),
  };
}
