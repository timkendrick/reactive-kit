import { isErrorEffect } from '@reactive-kit/effect-error';
import { useReactive } from '@reactive-kit/reactive-utils';
import { hash, type Hashable } from '@reactive-kit/hash';
import { createSignal, type Reactive, type Signal } from '@reactive-kit/types';
import { isNonEmptyArray, partition } from '@reactive-kit/utils';
import { createCatcher } from '@reactive-kit/types/src/types/catcher';

export const CATCHER_TYPE_ERROR_CATCH = '@reactive-kit/catcher-error-catch';

export function useCatch<T, V extends Hashable>(
  fallback: ((error: AggregateError) => Reactive<V>) & Hashable,
  value: Reactive<T>,
): Promise<T | V> {
  return useReactive<T | V>(
    createCatcher<T | V, typeof CATCHER_TYPE_ERROR_CATCH>(
      hash(CATCHER_TYPE_ERROR_CATCH, fallback),
      CATCHER_TYPE_ERROR_CATCH,
      value,
      (signal): Reactive<T | V> | Signal => {
        const [errorEffects, unrelatedEffects] = partition(signal.effects, isErrorEffect);
        if (errorEffects.length === 0) return signal;
        if (isNonEmptyArray(unrelatedEffects)) return createSignal(unrelatedEffects);
        return fallback(new AggregateError(errorEffects.flatMap(({ payload }) => payload.errors)));
      },
    ),
  );
}
