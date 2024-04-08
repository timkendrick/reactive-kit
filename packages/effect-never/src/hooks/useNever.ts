import { createEffectHook } from '@reactive-kit/effect';
import { createNeverEffect } from '../effects';

export function useNever(): Promise<never> {
  return createEffectHook<never>(createNeverEffect());
}
