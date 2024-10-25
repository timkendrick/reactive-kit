import { useReactive } from '@reactive-kit/reactive-utils';
import { type Hashable } from '@reactive-kit/hash';
import { createSetStateEffect } from '@reactive-kit/effect-state';

export function useSetState<T extends Hashable>(uid: string, value: T): Promise<null> {
  return useReactive(createSetStateEffect(uid, value));
}
