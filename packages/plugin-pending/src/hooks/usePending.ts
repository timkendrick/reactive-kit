import { useReactive } from '@reactive-kit/reactive-utils';
import { createPending } from '@reactive-kit/types';

export function usePending(): Promise<never> {
  return useReactive<never>(createPending());
}
