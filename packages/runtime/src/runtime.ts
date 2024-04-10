import type { Actor, ActorHandle } from '@reactive-kit/actor';
import { BroadcastActor } from '@reactive-kit/actor-utils';
import { EFFECT, type StateToken } from '@reactive-kit/effect';
import { createEvaluateEffect, EFFECT_TYPE_EVALUATE } from '@reactive-kit/effect-evaluate';
import { EvaluateHandler } from '@reactive-kit/handler-evaluate';
import { type Hashable } from '@reactive-kit/hash';
import {
  type ReadyEvaluationResult,
  type Reactive,
  type StateValues,
} from '@reactive-kit/interpreter';
import {
  MESSAGE_EMIT_EFFECT_VALUES,
  createSubscribeEffectsMessage,
  createUnsubscribeEffectsMessage,
  type RuntimeMessage,
} from '@reactive-kit/runtime-messages';
import { AsyncScheduler } from '@reactive-kit/scheduler';
import { createAsyncTrigger, type AsyncTrigger } from '@reactive-kit/utils';

export type RuntimeEffectHandlers = Iterable<(next: ActorHandle<unknown>) => Actor<unknown>>;

interface Subscription<T> {
  status: SubscriptionStatus<T>;
  callbacks: Array<(value: ReadyEvaluationResult<T>) => void>;
}

type SubscriptionStatus<T> =
  | {
      emitted: false;
    }
  | {
      emitted: true;
      value: ReadyEvaluationResult<T>;
    };

export class Runtime {
  private scheduler: AsyncScheduler<RuntimeMessage>;
  private subscriptionResults = new Map<StateToken, Subscription<any>>();
  private unsubscribeTrigger: AsyncTrigger<IteratorReturnResult<null>> | undefined;

  public constructor(
    handlers: RuntimeEffectHandlers,
    options?: {
      state?: StateValues;
    },
  ) {
    const { state = null } = options ?? {};
    this.scheduler = new AsyncScheduler((output, context) => {
      const input = context.self();
      // FIXME: compose effect handlers into single combined effect handler
      const evaluateHandler = context.spawn(() => new EvaluateHandler({ state }, input));
      const effectHandlers = Array.from(handlers, (factory) => context.spawn(() => factory(input)));
      return new BroadcastActor<RuntimeMessage>([evaluateHandler, ...effectHandlers, output]);
    });
  }

  public subscribe<T extends Hashable>(expression: Reactive<T>): AsyncIterator<T, null> {
    const { scheduler, subscriptionResults, unsubscribeTrigger: existingUnsubscribeTrigger } = this;
    const unsubscribeTrigger = existingUnsubscribeTrigger ?? createAsyncTrigger();
    if (!existingUnsubscribeTrigger) this.unsubscribeTrigger = unsubscribeTrigger;
    const isFirstSubscription = !existingUnsubscribeTrigger;
    const effect = createEvaluateEffect(expression);
    const effectId = effect[EFFECT];
    const existingResult = subscriptionResults.get(effectId);
    const subscriptionResult: Subscription<T> = existingResult ?? {
      status: { emitted: false },
      callbacks: new Array<(value: ReadyEvaluationResult<T>) => void>(),
    };
    let isPending = true;
    let isUnsubscribed = false;
    subscriptionResult.callbacks.push(onValue);
    if (!existingResult) {
      subscriptionResults.set(effectId, subscriptionResult);
      scheduler.dispatch(
        createSubscribeEffectsMessage(new Map([[EFFECT_TYPE_EVALUATE, [effect]]])),
      );
    }
    const queue = new Array<(value: IteratorResult<ReadyEvaluationResult<T>, null>) => void>();
    if (isFirstSubscription) {
      awaitEvaluationResults(scheduler, subscriptionResults, unsubscribeTrigger);
    }
    return {
      next: () => {
        if (isUnsubscribed) return Promise.resolve({ done: true, value: null });
        if (isPending && subscriptionResult.status.emitted) {
          isPending = false;
          const { value } = subscriptionResult.status.value;
          return Promise.resolve({ done: false, value });
        }
        isPending = false;
        return new Promise((resolve) => {
          queue.push((result) => {
            if (result.done) return resolve(result);
            const {
              value: { value },
            } = result;
            resolve({ done: false, value });
          });
        });
      },
      return: unsubscribe,
      throw: unsubscribe,
    };

    function onValue(value: ReadyEvaluationResult<T>): void {
      if (isUnsubscribed) return;
      subscriptionResult.status = { emitted: true, value };
      const callback = queue.shift();
      callback?.({ done: false, value });
    }

    function unsubscribe(): Promise<IteratorResult<T, null>> {
      if (isUnsubscribed) return Promise.resolve({ done: true, value: null });
      isUnsubscribed = true;
      subscriptionResult.callbacks.splice(subscriptionResult.callbacks.indexOf(onValue), 1);
      if (subscriptionResult.callbacks.length === 0) {
        subscriptionResults.delete(effectId);
        const isLastSubscription = subscriptionResults.size === 0;
        if (isLastSubscription) {
          unsubscribeTrigger.emit({ done: true, value: null });
        }
        scheduler.dispatch(
          createUnsubscribeEffectsMessage(new Map([[EFFECT_TYPE_EVALUATE, [effect]]])),
        );
      }
      const queuedResults = queue.slice();
      queue.length = 0;
      for (const callback of queuedResults) {
        callback({ done: true, value: null });
      }
      return Promise.resolve({ done: true, value: null });
    }
  }
}

function awaitEvaluationResults(
  scheduler: AsyncScheduler<RuntimeMessage>,
  subscriptionResults: Map<StateToken, Subscription<unknown>>,
  unsubscribeTrigger: AsyncTrigger<IteratorReturnResult<null>>,
): Promise<void> {
  return Promise.race([unsubscribeTrigger.signal, scheduler.next()]).then(
    function next(result): void | PromiseLike<void> {
      if (result.done) return;
      const { value: message } = result;
      const evaluationResults =
        message.type === MESSAGE_EMIT_EFFECT_VALUES
          ? message.updates.get(EFFECT_TYPE_EVALUATE)
          : undefined;
      if (evaluationResults) {
        for (const [stateToken, value] of evaluationResults) {
          const subscription = subscriptionResults.get(stateToken);
          if (!subscription) continue;
          for (const callback of subscription.callbacks) {
            callback(value);
          }
        }
      }
      return awaitEvaluationResults(scheduler, subscriptionResults, unsubscribeTrigger);
    },
  );
}
