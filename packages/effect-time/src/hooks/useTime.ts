import { createEffectHook } from '@reactive-kit/effect';
import { createTimeEffect } from '../effects';

export function useTime(options: { interval: number }): Promise<Date> {
  const { interval } = options;
  return createEffectHook<Date>(createTimeEffect(interval));
}
