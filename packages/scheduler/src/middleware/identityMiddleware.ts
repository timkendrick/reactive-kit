import {
  HandlerAction,
  type ActorHandle,
  type HandlerContext,
  type HandlerResult,
} from '@reactive-kit/actor';

import type { SchedulerCommandMessage } from '../messages';
import type { SchedulerMiddlewareActor, SchedulerMiddlewareFactory } from '../types';

export class IdentitySchedulerMiddlewareActor<T> implements SchedulerMiddlewareActor<T> {
  constructor(private next: ActorHandle<SchedulerCommandMessage<T>>) {}

  public handle(
    message: SchedulerCommandMessage<T>,
    _context: HandlerContext<SchedulerCommandMessage<T>>,
  ): HandlerResult<SchedulerCommandMessage<T>> {
    return [HandlerAction.Send({ target: this.next, message })];
  }
}

export function identityMiddleware<T>(): SchedulerMiddlewareFactory<T> {
  return {
    type: 'IdentityMiddleware',
    async: false,
    factory: (next: ActorHandle<SchedulerCommandMessage<T>>) =>
      new IdentitySchedulerMiddlewareActor(next),
  };
}
