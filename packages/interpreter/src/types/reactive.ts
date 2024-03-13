import { isEffect, type Effect } from '@reactive-kit/effect';
import { isStateful, type Stateful } from './state';

export type Reactive<T> = T | Effect | Stateful<T>;

export function isStatic<T>(value: Reactive<T>): value is T {
  return !isEffect(value) && !isStateful(value);
}
