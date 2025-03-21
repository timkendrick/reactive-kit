import type { MatchState, Pattern } from '../types';

export function repeat<T>(count: number, pattern: Pattern<T>): Pattern<T> {
  return {
    match: (initialState) => {
      let currentStates: Array<MatchState<T>> = [initialState];

      for (let i = 0; i < count; i++) {
        const nextStates: Array<MatchState<T>> = [];
        for (const state of currentStates) {
          const results = pattern.match(state);
          nextStates.push(...results);
        }

        if (nextStates.length === 0) {
          // Failed to match the required number of times
          return [];
        }
        currentStates = nextStates;
      }

      // Return the states after exactly 'count' successful matches
      return currentStates;
    },
  };
}
