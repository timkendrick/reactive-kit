import { useReactive } from '@reactive-kit/reactive-utils';
import { createGetStateEffect } from '@reactive-kit/effect-state';

export function useGetState<T>(uid: string): Promise<T> {
  return useReactive<T>(createGetStateEffect(uid));
}
