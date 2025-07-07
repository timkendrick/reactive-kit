import {
  HandlerAction,
  type ActorCreator,
  type ActorFactory,
  type ActorHandle,
  type HandlerContext,
  type HandlerResult,
} from '@reactive-kit/actor';

import type { SchedulerCommandMessage } from '../messages';
import type { SchedulerMiddlewareActor, SchedulerMiddlewareFactory } from '../types';

import { identityMiddleware } from './identityMiddleware';

export function chainMiddleware<T>(
  left: SchedulerMiddlewareFactory<T>,
  right: SchedulerMiddlewareFactory<T>,
): SchedulerMiddlewareFactory<T> {
  return {
    type: 'ChainMiddleware',
    async: false,
    factory: (next: ActorHandle<SchedulerCommandMessage<T>>) =>
      new ChainSchedulerMiddlewareActor(left, right, next),
  };
}

export class ChainSchedulerMiddlewareActor<T> implements SchedulerMiddlewareActor<T> {
  private leftActorHandle: ActorHandle<SchedulerCommandMessage<T>> | null = null;

  constructor(
    private left: SchedulerMiddlewareFactory<T>,
    private right: SchedulerMiddlewareFactory<T>,
    private next: ActorHandle<SchedulerCommandMessage<T>>,
  ) {}

  public init(
    context: HandlerContext<SchedulerCommandMessage<T>>,
  ): HandlerResult<SchedulerCommandMessage<T>> {
    // The 'right' actor is created first, pointing to the final 'next' handle.
    const rightActorCreator: ActorCreator<
      ActorHandle<SchedulerCommandMessage<T>>,
      SchedulerCommandMessage<T>,
      SchedulerCommandMessage<T>
    > = configureActorFactory(this.right, this.next);
    const rightActorHandle = context.spawn(rightActorCreator);
    // The 'left' actor is created second, pointing to the 'right' actor.
    const leftActorCreator: ActorCreator<
      ActorHandle<SchedulerCommandMessage<T>>,
      SchedulerCommandMessage<T>,
      SchedulerCommandMessage<T>
    > = configureActorFactory(this.left, rightActorHandle);
    // The handle to the 'left' actor is stored for the 'handle' method.
    this.leftActorHandle = context.spawn(leftActorCreator);
    // Return spawn actions for both actors so they get registered with the scheduler
    return [
      HandlerAction.Spawn({ target: rightActorHandle }),
      HandlerAction.Spawn({ target: this.leftActorHandle }),
    ];
  }

  public handle(
    message: SchedulerCommandMessage<T>,
    _context: HandlerContext<SchedulerCommandMessage<T>>,
  ): HandlerResult<SchedulerCommandMessage<T>> {
    if (!this.leftActorHandle) throw new Error('SchedulerMiddlewareChainActor not initialized');
    // Forward all incoming commands to the start of the chain.
    return [HandlerAction.Send({ target: this.leftActorHandle, message })];
  }
}

function configureActorFactory<C, I, O>(
  factory: ActorFactory<C, I, O>,
  config: C,
): ActorCreator<C, I, O> {
  // Type hack to allow both Sync and Async variants to be instantiated
  return factory.async ? { actor: factory, config } : { actor: factory, config };
}

export function composeMiddleware<T>(
  ...factories: Array<SchedulerMiddlewareFactory<T>>
): SchedulerMiddlewareFactory<T> {
  if (factories.length === 0) return identityMiddleware<T>();
  if (factories.length === 1) return factories[0];
  return factories.reduce(chainMiddleware);
}
