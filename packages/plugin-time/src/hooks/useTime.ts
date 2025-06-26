import { useReactive } from '@reactive-kit/reactive-utils';

import { createTimeEffect } from '../effects';

export function useTime(options: { interval: number }): Promise<Date> {
  const { interval } = options;
  return useReactive(createTimeEffect(interval));
}
