import type { ActorHandle, HandlerAction } from '@reactive-kit/actor';

export interface TestAction<T extends HandlerAction<unknown>> {
  action: T;
  state: unknown;
  from: ActorHandle<unknown>;
}
