import {
  AsyncTaskHandle,
  HandlerAction,
  type AsyncTaskFactory,
  type HandlerContext,
} from '@reactive-kit/actor';
import { type Message } from '@reactive-kit/runtime-messages';
import { EffectExpression, type EffectId } from '@reactive-kit/types';
import { EffectHandler } from './EffectHandler';
import type { EffectHandlerInput, EffectHandlerOutput } from './EffectHandler';
export type AsyncTaskId = number;

export interface AsyncTaskMessage<T> extends Message<T> {
  taskId: AsyncTaskId;
}

interface AsyncTaskRequest<T extends EffectExpression<unknown>, S> {
  effect: T;
  state: S;
  handle: AsyncTaskHandle;
}

export abstract class AsyncTaskHandler<
  T extends EffectExpression<unknown>,
  M extends AsyncTaskMessage<unknown>,
  S,
> extends EffectHandler<T, M> {
  protected subscriptions = new Map<EffectId, AsyncTaskId>();
  protected requests = new Map<AsyncTaskId, AsyncTaskRequest<T, S>>();
  protected nextTaskId = 1;

  protected abstract createTask(
    taskId: AsyncTaskId,
    effect: T,
    context: HandlerContext<EffectHandlerInput<M>>,
  ): {
    task: AsyncTaskFactory<M>;
    state: S;
  };

  protected abstract handleTaskMessage(
    message: M,
    state: S,
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
    const { task, state } = this.createTask(taskId, effect, context);
    const handle = context.spawnAsync(task);
    this.requests.set(taskId, { effect, handle, state });
    return [HandlerAction.Spawn(handle)];
  }

  protected override onUnsubscribe(
    effect: T,
    context: HandlerContext<EffectHandlerInput<M>>,
  ): EffectHandlerOutput<M> {
    const stateToken = effect.id;
    const taskId = this.subscriptions.get(stateToken);
    if (taskId === undefined) return null;
    this.subscriptions.delete(stateToken);
    const request = this.requests.get(taskId);
    if (request === undefined) return null;
    this.requests.delete(taskId);
    const { handle } = request;
    return [HandlerAction.Kill(handle)];
  }

  protected override handleInternal(
    message: Message<unknown>,
    context: HandlerContext<EffectHandlerInput<M>>,
  ): EffectHandlerOutput<M> {
    if (!this.acceptInternal(message)) return null;
    const { taskId } = message;
    const request = this.requests.get(taskId);
    if (request === undefined) return null;
    const { effect, state } = request;
    return this.handleTaskMessage(message, state, effect, context);
  }
}
