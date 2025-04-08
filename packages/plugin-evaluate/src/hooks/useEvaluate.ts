import type { Hashable } from '@reactive-kit/hash';
import { useReactive } from '@reactive-kit/reactive-utils';
import type { Expression } from '@reactive-kit/types';

import { createEvaluateEffect } from '../effects';

export function useEvaluate<T extends Hashable>(expression: Expression<T>): Promise<T> {
  return useReactive(createEvaluateEffect(expression));
}
