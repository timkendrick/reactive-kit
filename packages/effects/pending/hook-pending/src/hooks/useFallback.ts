import { isPendingEffect } from '@reactive-kit/effect-pending';
import { useReactive } from '@reactive-kit/reactive-utils';
import { hash, type Hashable } from '@reactive-kit/hash';
import { createSignal, type Reactive, type Signal } from '@reactive-kit/types';
import { isNonEmptyArray, partition } from '@reactive-kit/utils';
import { createCatcher } from '@reactive-kit/types/src/types/catcher';

export const CATCHER_TYPE_PENDING_FALLBACK = '@reactive-kit/catcher-pending-fallback';

export function useFallback<T, V extends Hashable>(
  fallback: (() => Reactive<V>) & Hashable,
  value: Reactive<T>,
): Promise<T | V> {
  return useReactive<T | V>(
    createCatcher<T | V, typeof CATCHER_TYPE_PENDING_FALLBACK>(
      hash(CATCHER_TYPE_PENDING_FALLBACK, fallback),
      CATCHER_TYPE_PENDING_FALLBACK,
      value,
      (signal): Reactive<T | V> | Signal => {
        const [pendingEffects, unrelatedEffects] = partition(signal.effects, isPendingEffect);
        if (pendingEffects.length === 0) return signal;
        if (isNonEmptyArray(unrelatedEffects)) return createSignal(unrelatedEffects);
        return fallback();
      },
    ),
  );
}
