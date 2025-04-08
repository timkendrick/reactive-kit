import type { ActorFactory, ActorHandle } from '@reactive-kit/actor';
import { BroadcastActor } from '@reactive-kit/actor-utils';
import type { Hashable } from '@reactive-kit/hash';
import {
  EFFECT_TYPE_EVALUATE,
  EvaluateHandler,
  createEvaluateEffect,
  type ReadyEvaluationResult,
  type StateValues,
} from '@reactive-kit/plugin-evaluate';
import {
  MESSAGE_EMIT_EFFECT_VALUES,
  createSubscribeEffectsMessage,
  createUnsubscribeEffectsMessage,
  type Message,
  type RuntimeMessage,
} from '@reactive-kit/runtime-messages';
import { AsyncScheduler } from '@reactive-kit/scheduler';
import { isResultExpression, type EffectId, type Expression } from '@reactive-kit/types';
import { createAsyncTrigger, type AsyncTrigger } from '@reactive-kit/utils';

export type RuntimeEffectHandlers = Iterable<
  ActorFactory<
    { next: ActorHandle<Message<unknown, unknown>> },
    Message<unknown, unknown>,
    Message<unknown, unknown>
  >
>;

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

export const ACTOR_TYPE_RUNTIME = '@reactive-kit/actor/runtime';

export class Runtime {
  private scheduler: AsyncScheduler<RuntimeMessage>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private subscriptionResults = new Map<EffectId, Subscription<any>>();
  private unsubscribeTrigger: AsyncTrigger<IteratorReturnResult<null>> | undefined;

  public constructor(
    handlers: RuntimeEffectHandlers,
    options?: {
      state?: StateValues;
    },
  ) {
    const { state = null } = options ?? {};
    this.scheduler = new AsyncScheduler((context) => {
      const input = context.self();
      // FIXME: compose effect handlers into single combined effect handler
      const evaluateHandler = context.spawn({
        actor: EvaluateHandler.FACTORY,
        config: { state, next: input },
      });
      const effectHandlers = Array.from(handlers, (factory) =>
        context.spawn({ actor: factory, config: { next: input } }),
      );
      return {
        type: ACTOR_TYPE_RUNTIME,
        async: false,
        factory: (output) =>
          new BroadcastActor<RuntimeMessage>([evaluateHandler, ...effectHandlers, output]),
      };
    });
  }

  public subscribe<T extends Hashable>(expression: Expression<T>): AsyncIterator<T, null> {
    const { scheduler, subscriptionResults, unsubscribeTrigger: existingUnsubscribeTrigger } = this;
    const unsubscribeTrigger = existingUnsubscribeTrigger ?? createAsyncTrigger();
    if (!existingUnsubscribeTrigger) this.unsubscribeTrigger = unsubscribeTrigger;
    const isFirstSubscription = !existingUnsubscribeTrigger;
    const effect = createEvaluateEffect(expression);
    const effectId = effect.id;
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
        createSubscribeEffectsMessage({ effects: new Map([[EFFECT_TYPE_EVALUATE, [effect]]]) }),
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
          createUnsubscribeEffectsMessage({ effects: new Map([[EFFECT_TYPE_EVALUATE, [effect]]]) }),
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
  subscriptionResults: Map<EffectId, Subscription<unknown>>,
  unsubscribeTrigger: AsyncTrigger<IteratorReturnResult<null>>,
): Promise<void> {
  return Promise.race([unsubscribeTrigger.signal, scheduler.next()]).then(
    function next(result): void | PromiseLike<void> {
      if (result.done) return;
      const { value: message } = result;
      const evaluationResults =
        message.type === MESSAGE_EMIT_EFFECT_VALUES
          ? message.payload.updates.get(EFFECT_TYPE_EVALUATE)
          : undefined;
      if (evaluationResults) {
        for (const [stateToken, value] of evaluationResults) {
          // FIXME: determine whether to handle non-result effect values
          if (!isResultExpression(value)) continue;
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
