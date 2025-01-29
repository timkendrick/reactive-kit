import {
  HandlerAction,
  type Actor,
  type ActorHandle,
  type AsyncTaskHandle,
  type HandlerContext,
  type HandlerResult,
  AsyncTaskFactory,
} from '@reactive-kit/actor';
import { fromAsyncIteratorFactory } from '@reactive-kit/actor-utils';
import {
  createEmitEffectValuesMessage,
  getTypedEffects,
  isSubscribeEffectsMessage,
  isUnsubscribeEffectsMessage,
  MESSAGE_SUBSCRIBE_EFFECTS,
  MESSAGE_UNSUBSCRIBE_EFFECTS,
  type EmitEffectValuesMessage,
  type Message,
  type SubscribeEffectsMessage,
  type UnsubscribeEffectsMessage,
} from '@reactive-kit/runtime-messages';
import { createResult, type EffectId } from '@reactive-kit/types';
import { createAsyncTrigger, nonNull, type AsyncTrigger } from '@reactive-kit/utils';
import { EFFECT_TYPE_TIME, type TimeEffect } from '../effects';
import {
  MESSAGE_TIME_HANDLER_EMIT,
  createTimeHandlerEmitMessage,
  isTimeHandlerEmitMessage,
  type TaskId,
  type TimeHandlerEmitMessage,
} from '../messages';

export type TimeHandlerInputMessage = SubscribeEffectsMessage | UnsubscribeEffectsMessage;
export type TimeHandlerOutputMessage = EmitEffectValuesMessage;

type TimeHandlerInternalMessage = TimeHandlerEmitMessage;
type TimeHandlerInput = TimeHandlerInputMessage | TimeHandlerInternalMessage;
type TimeHandlerOutput = HandlerResult<TimeHandlerOutputMessage | TimeHandlerInternalMessage>;

interface TimeSubscription {
  handle: AsyncTaskHandle;
  effect: TimeEffect;
}

export class TimeHandler implements Actor<Message<unknown>> {
  private readonly next: ActorHandle<TimeHandlerOutputMessage>;
  private subscriptions: Map<EffectId, TaskId> = new Map();
  private requests: Map<TaskId, TimeSubscription> = new Map();
  private nextTaskId: TaskId = 1;

  constructor(next: ActorHandle<TimeHandlerOutputMessage>) {
    this.next = next;
  }

  public handle(
    message: Message<unknown>,
    context: HandlerContext<TimeHandlerInput>,
  ): TimeHandlerOutput {
    if (!this.accept(message)) return null;
    switch (message.type) {
      case MESSAGE_SUBSCRIBE_EFFECTS:
        return this.handleSubscribeEffects(message, context);
      case MESSAGE_UNSUBSCRIBE_EFFECTS:
        return this.handleUnsubscribeEffects(message, context);
      case MESSAGE_TIME_HANDLER_EMIT:
        return this.handleTimeHandlerEmit(message, context);
    }
  }

  private accept(message: Message<unknown>): message is TimeHandlerInput {
    if (isSubscribeEffectsMessage(message)) return message.effects.has(EFFECT_TYPE_TIME);
    if (isUnsubscribeEffectsMessage(message)) return message.effects.has(EFFECT_TYPE_TIME);
    if (isTimeHandlerEmitMessage(message)) return true;
    return false;
  }

  private handleSubscribeEffects(
    message: SubscribeEffectsMessage,
    context: HandlerContext<TimeHandlerInput>,
  ): TimeHandlerOutput {
    const { effects } = message;
    const typedEffects = getTypedEffects<TimeEffect>(EFFECT_TYPE_TIME, effects);
    if (!typedEffects || typedEffects.length === 0) return null;
    const self = context.self();
    const actions = typedEffects
      .map((effect) => {
        const stateToken = effect.id;
        if (this.subscriptions.has(stateToken)) return null;
        const taskId = ++this.nextTaskId;
        this.subscriptions.set(stateToken, taskId);
        const factory = createTimeTaskFactory(taskId, effect, self);
        const handle = context.spawnAsync(factory);
        this.requests.set(taskId, {
          handle,
          effect,
        });
        return HandlerAction.Spawn(handle);
      })
      .filter(nonNull);
    if (actions.length === 0) return null;
    return actions;
  }

  private handleUnsubscribeEffects(
    message: UnsubscribeEffectsMessage,
    context: HandlerContext<TimeHandlerInput>,
  ): TimeHandlerOutput {
    const { effects } = message;
    const typedEffects = getTypedEffects<TimeEffect>(EFFECT_TYPE_TIME, effects);
    if (!typedEffects || typedEffects.length === 0) return null;
    const actions = typedEffects
      .map((effect) => {
        const stateToken = effect.id;
        const taskId = this.subscriptions.get(stateToken);
        if (taskId === undefined) return null;
        this.subscriptions.delete(stateToken);
        const requestState = this.requests.get(taskId);
        if (!requestState) return null;
        this.requests.delete(taskId);
        const { handle } = requestState;
        return HandlerAction.Kill(handle);
      })
      .filter(nonNull);
    if (actions.length === 0) return null;
    return actions;
  }

  private handleTimeHandlerEmit(
    message: TimeHandlerEmitMessage,
    context: HandlerContext<TimeHandlerInput>,
  ): TimeHandlerOutput {
    const { taskId, time } = message;
    const subscription = this.requests.get(taskId);
    if (!subscription) return null;
    const effect = subscription.effect;
    const stateToken = effect.id;
    const effectValue = createResult(time);
    const effectValues = new Map([[EFFECT_TYPE_TIME, new Map([[stateToken, effectValue]])]]);
    const emitMessage = createEmitEffectValuesMessage(effectValues);
    const action = HandlerAction.Send(this.next, emitMessage);
    return [action];
  }
}

function createTimeTaskFactory(
  taskId: TaskId,
  effect: TimeEffect,
  output: ActorHandle<TimeHandlerInternalMessage>,
): AsyncTaskFactory<never, TimeHandlerInternalMessage> {
  const interval = effect.payload;
  return fromAsyncIteratorFactory<TimeHandlerInternalMessage>(() => {
    let activeInterval: ReturnType<typeof setInterval> | undefined;
    const requestQueue = new Array<AsyncTrigger<Date>['emit']>();
    const resultQueue = new Array<Date>();
    function onEmit(value: Date): void {
      const pendingRequest = requestQueue.shift();
      if (pendingRequest) {
        pendingRequest(value);
      } else {
        resultQueue.push(value);
      }
    }
    return {
      next(): Promise<IteratorResult<HandlerResult<TimeHandlerInternalMessage>>> {
        if (!activeInterval) {
          resultQueue.push(new Date());
          activeInterval = setInterval(() => onEmit(new Date()), interval);
        }
        const nextValue = (() => {
          const queuedResult = resultQueue.shift();
          if (queuedResult != null) {
            return Promise.resolve(queuedResult);
          } else {
            const { signal, emit } = createAsyncTrigger<Date>();
            requestQueue.push(emit);
            return signal;
          }
        })();
        return nextValue.then((value) => ({
          done: false,
          value: [HandlerAction.Send(output, createTimeHandlerEmitMessage(taskId, value))],
        }));
      },
      return(): Promise<IteratorResult<HandlerResult<TimeHandlerInternalMessage>>> {
        if (activeInterval != null) clearInterval(activeInterval);
        requestQueue.length = 0;
        resultQueue.length = 0;
        return Promise.resolve({ done: true, value: null });
      },
      throw(): Promise<IteratorResult<HandlerResult<TimeHandlerInternalMessage>>> {
        if (activeInterval != null) clearInterval(activeInterval);
        requestQueue.length = 0;
        resultQueue.length = 0;
        return Promise.resolve({ done: true, value: null });
      },
    };
  });
}
