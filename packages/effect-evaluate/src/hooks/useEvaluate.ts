import { type Hashable } from '@reactive-kit/hash';
import { type Reactive } from '@reactive-kit/interpreter';
import { createEvaluateEffect } from '../effects';
import { createEffectHook } from '@reactive-kit/effect';

export function useEvaluate<T extends Hashable>(expression: Reactive<T>): Promise<T> {
  return createEffectHook<T>(createEvaluateEffect(expression));
}
