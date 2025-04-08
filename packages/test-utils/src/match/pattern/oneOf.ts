import type { MatchState, Pattern } from '../types';

export function oneOf<T>(...patterns: Array<Pattern<T>>): Pattern<T> {
  return {
    match: (state) => {
      const allResults: Array<MatchState<T>> = [];
      for (const pattern of patterns) {
        const results = pattern.match(state);
        allResults.push(...results);
      }
      // Collect results from all patterns
      return allResults;
    },
  };
}
