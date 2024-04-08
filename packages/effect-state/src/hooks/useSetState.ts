import { createEffectHook } from '@reactive-kit/effect';
import { type Hashable } from '@reactive-kit/hash';
import { createSetStateEffect } from '../effects';

export function useSetState<T extends Hashable>(uid: string, value: T): Promise<null> {
  return createEffectHook<null>(createSetStateEffect(uid, value));
}
