/// <reference lib="dom" />
import {
  HandlerAction,
  type ActorHandle,
  type AsyncTaskHandle,
  type HandlerContext
} from '@reactive-kit/actor';
import {
  EffectHandler,
  EffectHandlerOutputMessage,
  type EffectHandlerInput,
  type EffectHandlerOutput,
} from '@reactive-kit/handler-utils';
import type { Message } from '@reactive-kit/runtime-messages';
import { createResult, type EffectId, type Expression } from '@reactive-kit/types';
import { EFFECT_TYPE_FETCH, type FetchEffect } from '../effects';
import {
  isFetchHandlerResponseMessage,
  type FetchHandlerResponseMessage,
  type TaskId
} from '../messages';
import { createFetchTask } from '../tasks';

type FetchHandlerInternalMessage = FetchHandlerResponseMessage;

interface FetchSubscription {
  handle: AsyncTaskHandle;
  effect: FetchEffect;
  controller: AbortController;
}

export class FetchHandler extends EffectHandler<FetchEffect, FetchHandlerInternalMessage> {
  private subscriptions: Map<EffectId, TaskId> = new Map();
  private requests: Map<TaskId, FetchSubscription> = new Map();
  private nextTaskId: TaskId = 1;

  public constructor(next: ActorHandle<EffectHandlerOutputMessage>) {
    super(EFFECT_TYPE_FETCH, next);
  }

  protected override getInitialValue(effect: FetchEffect): Expression<any> | null {
    return null;
  }

  protected onSubscribe(
    effect: FetchEffect,
    context: HandlerContext<EffectHandlerInput<FetchHandlerInternalMessage>>,
  ): EffectHandlerOutput<FetchHandlerInternalMessage> {
    const stateToken = effect.id;
    if (this.subscriptions.has(stateToken)) return null;
    const taskId = ++this.nextTaskId;
    this.subscriptions.set(stateToken, taskId);
    const controller = new AbortController();
    const task = createFetchTask(taskId, effect, controller, context.self());
    const handle = context.spawnAsync(task);
    this.requests.set(taskId, {
      handle,
      effect,
      controller,
    });
    return [HandlerAction.Spawn(handle)];
  }

  protected onUnsubscribe(
    effect: FetchEffect,
    context: HandlerContext<EffectHandlerInput<FetchHandlerInternalMessage>>,
  ): EffectHandlerOutput<FetchHandlerInternalMessage> {
    const stateToken = effect.id;
    const taskId = this.subscriptions.get(stateToken);
    if (taskId === undefined) return null;
    this.subscriptions.delete(stateToken);
    const requestState = this.requests.get(taskId);
    if (!requestState) return null;
    this.requests.delete(taskId);
    const { handle, controller } = requestState;
    controller.abort();
    return [HandlerAction.Kill(handle)];
  }

  protected acceptInternal(message: Message<unknown>): message is FetchHandlerInternalMessage {
    if (isFetchHandlerResponseMessage(message)) return true;
    return false;
  }

  protected handleInternal(
    message: Message<unknown>,
    context: HandlerContext<EffectHandlerInput<FetchHandlerInternalMessage>>,
  ): EffectHandlerOutput<FetchHandlerInternalMessage> {
    if (isFetchHandlerResponseMessage(message)) {
      return this.handleFetchHandlerResponse(message, context);
    }
    return null;
  }

  private handleFetchHandlerResponse(
    message: FetchHandlerResponseMessage,
    context: HandlerContext<EffectHandlerInput<FetchHandlerInternalMessage>>,
  ): EffectHandlerOutput<FetchHandlerInternalMessage> {
    const { taskId, response } = message;
    const subscription = this.requests.get(taskId);
    if (!subscription) return null;
    const effect = subscription.effect;
    const stateToken = effect.id;
    this.requests.delete(taskId);
    this.subscriptions.delete(stateToken);
    const effectValue = createResult(response);
    const action = this.emit(EFFECT_TYPE_FETCH, new Map([[stateToken, effectValue]]));
    return [action];
  }
}
