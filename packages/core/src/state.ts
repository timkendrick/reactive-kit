import {
  STATEFUL,
  StateValues,
  type Stateful,
  type StateToken,
  type StatefulResult,
} from '@trigger/types';

export function createStateful<T>(next: (state: StateValues) => StatefulResult<T>): Stateful<T> {
  return {
    [STATEFUL]: true,
    next,
  };
}
