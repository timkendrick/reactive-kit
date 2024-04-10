import { createEffectHook } from '@reactive-kit/effect';
import { createNeverEffect } from '@reactive-kit/effect-never';

export function useNever(): Promise<never> {
  return createEffectHook<never>(createNeverEffect());
}
