import { useReactive } from '@reactive-kit/reactive-utils';
import { createPendingEffect } from '@reactive-kit/effect-pending';

export function usePending(): Promise<never> {
  return useReactive<never>(createPendingEffect());
}
