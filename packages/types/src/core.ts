import { isSignal, type Signal } from './signal';
import { isStateful, type Stateful } from './state';

export type Reactive<T> = T | Signal<T> | Stateful<T>;

export function isStatic<T>(value: Reactive<T>): value is T {
  return !isSignal(value) && !isStateful(value);
}
