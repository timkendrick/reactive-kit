import { type Effect } from '@reactive-kit/effect';
import { type Stateful } from './state';

export type Reactive<T> = T | Effect | Stateful<T>;
