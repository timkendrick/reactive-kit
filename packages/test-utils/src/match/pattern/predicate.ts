import type { Pattern, Predicate } from '../types';

export function predicate<T>(pattern: Predicate<T>): Pattern<T> {
  return {
    match: (state) => {
      if (state.nextIndex >= state.input.length) return [];
      const item = state.input[state.nextIndex];
      const result = pattern(item);
      if (!result) return [];
      return [
        {
          ...state,
          nextIndex: state.nextIndex + 1,
        },
      ];
    },
  };
}
