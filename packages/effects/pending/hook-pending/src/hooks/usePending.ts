import { createEffectHook } from '@reactive-kit/effect';
import { createPendingEffect } from '@reactive-kit/effect-pending';

export function usePending(): Promise<never> {
  return createEffectHook<never>(createPendingEffect());
}
