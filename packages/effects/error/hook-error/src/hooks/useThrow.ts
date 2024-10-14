import { createErrorEffect, ReactiveError } from '@reactive-kit/effect-error';
import { useReactive } from '@reactive-kit/reactive-utils';
import { type Hashable } from '@reactive-kit/hash';

export function useThrow(error: Error & Hashable): Promise<never> {
  return useReactive(createErrorEffect(new ReactiveError([error])));
}
