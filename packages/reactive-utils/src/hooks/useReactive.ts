import type { Reactive } from '@reactive-kit/types';

export function useReactive<T>(expression: Reactive<T>): Promise<T> {
  return expression as unknown as Promise<T>;
}
