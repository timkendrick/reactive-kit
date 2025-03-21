import type { MatchState, Pattern } from '../types';

export function oneOrMore<T>(pattern: Pattern<T>): Pattern<T> {
  return {
    match: (initialState) => {
      // --- Step 1: Ensure at least ONE match ---
      const firstMatchResults = pattern.match(initialState);
      if (firstMatchResults.length === 0) {
        // Pattern didn't even match once from the start
        return [];
      }

      // --- Step 2: Find subsequent matches (like zeroOrMore) ---

      // Keep track of all valid end states (after >= 1 match)
      const finalResults: Array<MatchState<T>> = [];
      // Use a queue for states to process to find *more* matches
      const queue: Array<MatchState<T>> = [];
      // Use a set to prevent infinite loops with non-consuming patterns
      const visitedIndices = new Set<number>();

      // Add the results of the first match to final results and queue
      for (const state of firstMatchResults) {
        if (!visitedIndices.has(state.nextIndex)) {
          finalResults.push(state);
          queue.push(state);
          visitedIndices.add(state.nextIndex);
        }
      }

      while (queue.length > 0) {
        const currentState = queue.shift();
        if (!currentState) break;

        // Try to match the pattern *again* from the current state
        const subsequentMatchResults = pattern.match(currentState);

        for (const nextState of subsequentMatchResults) {
          // Check if we've already reached a state ending at this index
          if (!visitedIndices.has(nextState.nextIndex)) {
            // Add the new state as a valid result (representing one *more* match)
            finalResults.push(nextState);
            // Add to the queue to see if we can match even more
            queue.push(nextState);
            // Mark this index as visited
            visitedIndices.add(nextState.nextIndex);
          }
        }
      }

      // Return all states reached after one or more matches
      return finalResults;
    },
  };
}
