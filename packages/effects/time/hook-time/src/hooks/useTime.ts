import { useReactive } from '@reactive-kit/reactive-utils';
import { createTimeEffect } from '@reactive-kit/effect-time';

export function useTime(options: { interval: number }): Promise<Date> {
  const { interval } = options;
  return useReactive<Date>(createTimeEffect(interval));
}
