import type { Expression } from '@reactive-kit/types';

export function useReactive<T>(expression: Expression<T>): Promise<T> {
  return expression as unknown as Promise<T>;
}
