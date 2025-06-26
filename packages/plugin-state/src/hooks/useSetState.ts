import type { Hashable } from '@reactive-kit/hash';
import { useReactive } from '@reactive-kit/reactive-utils';

import { createSetStateEffect } from '../effects';

export function useSetState<T extends Hashable>(uid: string, value: T): Promise<null> {
  return useReactive(createSetStateEffect(uid, value));
}
