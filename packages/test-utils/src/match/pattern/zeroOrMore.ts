import type { MatchState, Pattern } from '../types';

export function zeroOrMore<T>(pattern: Pattern<T>): Pattern<T> {
  return {
    match: (state) => {
      // Keep track of all possible states reached
      const results: Array<MatchState<T>> = [];
      // A set to keep track of visited states (by nextIndex) to prevent infinite loops
      const visitedIndices = new Set<number>();
      // Queue for states to process
      const queue: Array<MatchState<T>> = [state];

      // The initial state is always a valid result (zero matches)
      results.push(state);
      visitedIndices.add(state.nextIndex);

      while (queue.length > 0) {
        const currentState = queue.shift();
        if (!currentState) break;

        // Try to match the pattern from the current state
        const nextResults = pattern.match(currentState);

        for (const nextState of nextResults) {
          // Check if we've already processed a state ending at this index
          // This prevents infinite loops if a pattern can match without consuming input
          if (!visitedIndices.has(nextState.nextIndex)) {
            // Add the new state as a valid result (at least one match)
            results.push(nextState);
            // Add to the queue to see if we can match *more*
            queue.push(nextState);
            // Mark this index as visited
            visitedIndices.add(nextState.nextIndex);
          }
        }
      }

      // Return all accumulated results (including the initial state for zero matches)
      return results;
    },
  };
}
