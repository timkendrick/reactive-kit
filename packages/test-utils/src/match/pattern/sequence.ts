import type { MatchState, Pattern } from '../types';

export function sequence<T>(...patterns: Array<Pattern<T>>): Pattern<T> {
  return {
    match: (initialState) => {
      // This will hold the final states after all patterns in the sequence have matched
      let currentStates: Array<MatchState<T>> = [initialState];

      // Iterate through each pattern in the sequence
      for (const pattern of patterns) {
        const nextStates: Array<MatchState<T>> = [];
        // For each current possible state, try to match the next pattern in the sequence
        for (const state of currentStates) {
          const results = pattern.match(state);
          // Add all successful matches from this pattern to the list of states for the *next* pattern
          nextStates.push(...results);
        }

        // If no states matched the current pattern, the sequence fails
        if (nextStates.length === 0) {
          return [];
        }
        // Otherwise, update the current states for the next iteration
        currentStates = nextStates;
      }

      // Return all the states that successfully matched the entire sequence
      return currentStates;
    },
  };
}
