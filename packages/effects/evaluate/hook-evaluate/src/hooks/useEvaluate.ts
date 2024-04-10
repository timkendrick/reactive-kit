import { type Hashable } from '@reactive-kit/hash';
import { type Reactive } from '@reactive-kit/interpreter';
import { createEffectHook } from '@reactive-kit/effect';
import { createEvaluateEffect } from '@reactive-kit/effect-evaluate';

export function useEvaluate<T extends Hashable>(expression: Reactive<T>): Promise<T> {
  return createEffectHook<T>(createEvaluateEffect(expression));
}
