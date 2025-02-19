import {
  HandlerAction,
  type ActorHandle,
  type AsyncTaskHandle,
  type HandlerContext,
} from '@reactive-kit/actor';
import {
  EffectHandler,
  EffectHandlerInput,
  EffectHandlerOutput,
  EffectHandlerOutputMessage,
} from '@reactive-kit/handler-utils';
import { type Message } from '@reactive-kit/runtime-messages';
import { createResult, type Expression, type EffectId } from '@reactive-kit/types';
import { EFFECT_TYPE_TIME, type TimeEffect } from '../effects';
import { isTimeHandlerEmitMessage, type TaskId, type TimeHandlerEmitMessage } from '../messages';
import { createTimeTask } from '../tasks/TimeTask';

interface TimeSubscription {
  handle: AsyncTaskHandle;
  effect: TimeEffect;
}

type TimeHandlerInternalMessage = TimeHandlerEmitMessage;

export class TimeHandler extends EffectHandler<TimeEffect, TimeHandlerInternalMessage> {
  private subscriptions: Map<EffectId, TaskId> = new Map();
  private requests: Map<TaskId, TimeSubscription> = new Map();
  private nextTaskId: TaskId = 1;

  public constructor(next: ActorHandle<EffectHandlerOutputMessage>) {
    super(EFFECT_TYPE_TIME, next);
  }

  protected override getInitialValue(effect: TimeEffect): Expression<any> | null {
    return null;
  }

  protected override onSubscribe(
    effect: TimeEffect,
    context: HandlerContext<EffectHandlerInput<TimeHandlerInternalMessage>>,
  ): EffectHandlerOutput<TimeHandlerInternalMessage> {
    const stateToken = effect.id;
    if (this.subscriptions.has(stateToken)) return null;
    const self = context.self();
    const taskId = ++this.nextTaskId;
    this.subscriptions.set(stateToken, taskId);
    const factory = createTimeTask(taskId, effect, self);
    const handle = context.spawnAsync(factory);
    this.requests.set(taskId, { handle, effect });
    return [HandlerAction.Spawn(handle)];
  }

  protected override onUnsubscribe(
    effect: TimeEffect,
    context: HandlerContext<EffectHandlerInput<TimeHandlerInternalMessage>>,
  ): EffectHandlerOutput<TimeHandlerInternalMessage> {
    const stateToken = effect.id;
    const taskId = this.subscriptions.get(stateToken);
    if (taskId === undefined) return null;
    this.subscriptions.delete(stateToken);
    const requestState = this.requests.get(taskId);
    if (!requestState) return null;
    this.requests.delete(taskId);
    const { handle } = requestState;
    return [HandlerAction.Kill(handle)];
  }

  protected override acceptInternal(
    message: Message<unknown>,
  ): message is TimeHandlerInternalMessage {
    if (isTimeHandlerEmitMessage(message)) return true;
    return false;
  }

  protected override handleInternal(
    message: Message<unknown>,
    context: HandlerContext<EffectHandlerInput<TimeHandlerInternalMessage>>,
  ): EffectHandlerOutput<TimeHandlerInternalMessage> {
    if (isTimeHandlerEmitMessage(message)) {
      return this.handleTimeHandlerEmit(message, context);
    }
    return null;
  }

  private handleTimeHandlerEmit(
    message: TimeHandlerEmitMessage,
    context: HandlerContext<EffectHandlerInput<TimeHandlerInternalMessage>>,
  ): EffectHandlerOutput<TimeHandlerInternalMessage> {
    const { taskId, time } = message;
    const subscription = this.requests.get(taskId);
    if (!subscription) return null;
    const effect = subscription.effect;
    const effectValue = createResult(time);
    const action = this.emit(EFFECT_TYPE_TIME, new Map([[effect.id, effectValue]]));
    return [action];
  }
}
