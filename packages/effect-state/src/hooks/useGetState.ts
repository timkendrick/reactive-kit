import { createEffectHook } from '@reactive-kit/effect';
import { createGetStateEffect } from '../effects';

export function useGetState<T>(uid: string): Promise<T> {
  return createEffectHook<T>(createGetStateEffect(uid));
}
