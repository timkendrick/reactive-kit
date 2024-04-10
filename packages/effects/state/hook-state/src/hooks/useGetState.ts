import { createEffectHook } from '@reactive-kit/effect';
import { createGetStateEffect } from '@reactive-kit/effect-state';

export function useGetState<T>(uid: string): Promise<T> {
  return createEffectHook<T>(createGetStateEffect(uid));
}
