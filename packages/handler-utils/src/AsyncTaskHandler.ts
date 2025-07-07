import {
  HandlerAction,
  type AsyncTaskFactory,
  type AsyncTaskHandle,
  type HandlerContext,
} from '@reactive-kit/actor';
import type { Message } from '@reactive-kit/message';
import type { EffectExpression, EffectId } from '@reactive-kit/types';

import { EffectHandler, type EffectHandlerInput, type EffectHandlerOutput } from './EffectHandler';
export type AsyncTaskId = number;

export type AsyncTaskMessage<T, V extends AsyncTaskMessagePayload> = Message<T, V>;

export interface AsyncTaskMessagePayload {
  taskId: AsyncTaskId;
}

export interface AsyncTaskRequest<T extends EffectExpression<unknown>, C> {
  effect: T;
  config: C;
  handle: AsyncTaskHandle;
}

export abstract class AsyncTaskHandler<
  T extends EffectExpression<unknown>,
  M extends AsyncTaskMessage<unknown, AsyncTaskMessagePayload>,
  C,
> extends EffectHandler<T, M> {
  protected subscriptions = new Map<EffectId, AsyncTaskId>();
  protected requests = new Map<AsyncTaskId, AsyncTaskRequest<T, C>>();
  protected nextTaskId = 1;

  protected abstract createTask(
    taskId: AsyncTaskId,
    effect: T,
    context: HandlerContext<EffectHandlerInput<M>>,
  ): {
    // FIXME: Allow input message type in async task factory
    task: AsyncTaskFactory<C, never, M>;
    config: C;
  };

  protected abstract handleTaskMessage(
    message: M,
    config: C,
    effect: T,
    context: HandlerContext<EffectHandlerInput<M>>,
  ): EffectHandlerOutput<M>;

  protected override onSubscribe(
    effect: T,
    context: HandlerContext<EffectHandlerInput<M>>,
  ): EffectHandlerOutput<M> {
    const stateToken = effect.id;
    if (this.subscriptions.has(stateToken)) return null;
    const taskId = this.nextTaskId++;
    this.subscriptions.set(stateToken, taskId);
    const { task, config } = this.createTask(taskId, effect, context);
    const handle = context.spawn({ actor: task, config });
    this.requests.set(taskId, { effect, handle, config });
    return [HandlerAction.Spawn({ target: handle })];
  }

  protected override onUnsubscribe(
    effect: T,
    _context: HandlerContext<EffectHandlerInput<M>>,
  ): EffectHandlerOutput<M> {
    const stateToken = effect.id;
    const taskId = this.subscriptions.get(stateToken);
    if (taskId === undefined) return null;
    this.subscriptions.delete(stateToken);
    const request = this.requests.get(taskId);
    if (request === undefined) return null;
    this.requests.delete(taskId);
    const { handle } = request;
    return [HandlerAction.Kill({ target: handle })];
  }

  protected override handleInternal(
    message: Message<unknown, unknown>,
    context: HandlerContext<EffectHandlerInput<M>>,
  ): EffectHandlerOutput<M> {
    if (!this.acceptInternal(message)) return null;
    const { taskId } = message.payload;
    const request = this.requests.get(taskId);
    if (request === undefined) return null;
    const { effect, config } = request;
    return this.handleTaskMessage(message, config, effect, context);
  }
}
