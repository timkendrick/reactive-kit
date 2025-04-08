import { useReactive } from '@reactive-kit/reactive-utils';

import { createGetStateEffect } from '../effects';

export function useGetState<T>(uid: string): Promise<T> {
  return useReactive(createGetStateEffect<T>(uid));
}
