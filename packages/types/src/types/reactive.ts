import { type Effect } from './effect';
import { type Catcher } from './catcher';
import { type Stateful } from './stateful';
import { Fork } from './fork';

export type Reactive<T> =
  | T
  | Stateful<T>
  | Effect<T>
  | Catcher<T>
  | (T extends Array<unknown> ? Fork<T> : never);
