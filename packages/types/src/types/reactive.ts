import { type Effect } from './effect';
import { type Catcher } from './catcher';
import { type Stateful } from './stateful';

export type Reactive<T> = T | Stateful<T> | Effect<T> | Catcher<T>;
