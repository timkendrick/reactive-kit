import { type Effect } from './effect';
import { type Stateful } from './stateful';

export type Reactive<T> = T | Effect | Stateful<T>;
