import { type MatchState, type Pattern, type PatternMatchResults } from './types';

export function matchPattern<T>(input: Array<T>, pattern: Pattern<T>): PatternMatchResults<T> {
  const state: MatchState<T> = {
    input,
    nextIndex: 0,
    captures: [],
  };
  const results = pattern.match(state);
  return results;
}
