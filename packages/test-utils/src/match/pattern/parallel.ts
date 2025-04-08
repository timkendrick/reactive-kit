import type { MatchState, Pattern } from '../types';

export function parallel<T>(...patterns: Array<Pattern<T>>): Pattern<T> {
  const numPatterns = patterns.length;
  if (numPatterns === 0) {
    // Matching zero patterns in parallel trivially succeeds without consuming input.
    return { match: (state) => [state] };
  }

  return {
    match: (initialState) => {
      // State for the backtracking search queue
      type SearchState = {
        state: MatchState<T>; // Current input state (index, captures, etc.)
        matchedMask: number; // Bitmask of patterns matched so far
        consumedIndices: Set<number>; // Input indices consumed by patterns in this path
      };

      /**
       * Key for preventing duplicate states in the backtracking search queue
       */
      function getSearchStateKey(searchState: SearchState): string {
        return `${searchState.state.nextIndex}:${searchState.matchedMask}:${[
          ...searchState.consumedIndices,
        ]
          .sort()
          .join(',')}`;
      }

      const initialSearchState: SearchState = {
        state: initialState,
        matchedMask: 0,
        consumedIndices: new Set(),
      };

      // Queue of search states to explore
      const queue: Array<SearchState> = [initialSearchState];
      // Results of successful matches
      const finalStates: Array<MatchState<T>> = [];
      // Visited set to prevent cycles and redundant work
      const visited = new Set<string>();
      while (queue.length > 0) {
        const currentSearch = queue.shift()!;
        const visitedKey = getSearchStateKey(currentSearch);
        if (visited.has(visitedKey)) {
          continue;
        }
        visited.add(visitedKey);

        const { state: currentState, matchedMask, consumedIndices } = currentSearch;

        // Check if all patterns have been matched in this path
        if (matchedMask === (1 << numPatterns) - 1) {
          // If yes, this is a potential successful result state.
          // We don't need the contiguity check here as the core logic handles consumption.
          finalStates.push(currentState);
          continue; // Continue searching for other potential final states
        }

        // Try matching each pattern `i` that hasn't been matched yet
        for (let i = 0; i < numPatterns; i++) {
          if (!(matchedMask & (1 << i))) {
            // Pattern `i` is not yet matched in this path
            const patternToTry = patterns[i];
            const patternResults = patternToTry.match(currentState);

            // Explore results of matching pattern `i`
            for (const nextState of patternResults) {
              const startIndex = currentState.nextIndex;
              const endIndex = nextState.nextIndex;
              let overlap = false;
              const newlyConsumed = new Set<number>();

              // Check for overlap with already consumed indices *in this specific path*
              for (let k = startIndex; k < endIndex; k++) {
                if (consumedIndices.has(k)) {
                  overlap = true;
                  break;
                }
                newlyConsumed.add(k);
              }

              if (!overlap) {
                // No overlap, create the next search state
                const newMask = matchedMask | (1 << i);
                const newConsumed = new Set([...consumedIndices, ...newlyConsumed]);

                queue.push({
                  state: nextState,
                  matchedMask: newMask,
                  consumedIndices: newConsumed,
                });
              }
            }
          }
        }
      }

      // Deduplicate final states based on nextIndex - choose the one with the simplest path?
      // For now, let's filter based on the most common end state properties if duplicates exist.
      // A simpler approach might be needed if specific capture behavior is required.
      const uniqueFinalStatesMap = new Map<number, MatchState<T>>();
      for (const finalState of finalStates) {
        if (!uniqueFinalStatesMap.has(finalState.nextIndex)) {
          uniqueFinalStatesMap.set(finalState.nextIndex, finalState);
        }
        // Add logic here if you need to prioritize certain states based on captures,
        // or handle multiple successful paths ending at the same index differently.
      }

      return Array.from(uniqueFinalStatesMap.values());
    },
  };
}
