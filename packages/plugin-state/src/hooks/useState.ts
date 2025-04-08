import type { Hashable } from '@reactive-kit/hash';

import type { StateId } from '../types';

import { useGetState } from './useGetState';
import { useSetState } from './useSetState';

export function useState<T extends Hashable>(
  uid: StateId,
): [Promise<T>, (value: T) => Promise<null>] {
  return [useGetState(uid), set];

  function set(value: T): Promise<null> {
    return useSetState(uid, value);
  }
}
