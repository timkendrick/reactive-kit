import {
  HandlerAction,
  type ActorHandle,
  type AsyncTaskHandle,
  type HandlerContext,
  type HandlerResult,
  AsyncTaskFactory,
} from '@reactive-kit/actor';
import { fromAsyncIteratorFactory } from '@reactive-kit/actor-utils';
import {
  EffectHandler,
  EffectHandlerInput,
  EffectHandlerOutput,
  EffectHandlerOutputMessage,
} from '@reactive-kit/handler-utils';
import { type Message } from '@reactive-kit/runtime-messages';
import { createResult, type Expression, type EffectId } from '@reactive-kit/types';
import { createAsyncTrigger, type AsyncTrigger } from '@reactive-kit/utils';
import { EFFECT_TYPE_TIME, type TimeEffect } from '../effects';
import {
  createTimeHandlerEmitMessage,
  isTimeHandlerEmitMessage,
  type TaskId,
  type TimeHandlerEmitMessage,
} from '../messages';

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

  protected override getInitialValue(effect: TimeEffect): Expression<any> | null  {
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
    const factory = createTimeTaskFactory(taskId, effect, self);
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
    const action = this.emit(new Map([[effect.id, effectValue]]));
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
