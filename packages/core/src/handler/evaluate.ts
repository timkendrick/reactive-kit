import {
  DependencyTree,
  Effect,
  EvaluationResult,
  Handler,
  HandlerAction,
  HandlerInput,
  HandlerResult,
  ProcessId,
  Reactive,
  EFFECT,
  StateToken,
  StateValues,
  Hash,
} from '@trigger/types';
import { nonNull } from '@trigger/utils';
import {
  EMPTY_DEPENDENCIES,
  evaluate,
  flattenConditionTree,
  flattenDependencyTree,
  getTypedEffects,
  groupEffectsByType,
  hash,
} from '../utils';
import {
  createEmitEffectValuesMessage,
  createSubscribeEffectsMessage,
  createUnsubscribeEffectsMessage,
  EmitEffectValuesMessage,
  MESSAGE_SUBSCRIBE_EFFECTS,
  MESSAGE_UNSUBSCRIBE_EFFECTS,
  SubscribeEffectsMessage,
  UnsubscribeEffectsMessage,
} from '../message';
import { EFFECT_TYPE_EVALUATE, EvaluateEffect } from '../effect/evaluate';

type EvaluateHandlerInputMessage = SubscribeEffectsMessage | UnsubscribeEffectsMessage;
type EvaluateHandlerOutputMessage =
  | SubscribeEffectsMessage
  | UnsubscribeEffectsMessage
  | EmitEffectValuesMessage;

type EvaluateHandlerInput = HandlerInput<EvaluateHandlerInputMessage>;
type EvaluateHandlerOutput = HandlerResult<EvaluateHandlerOutputMessage>;

interface QuerySubscription<T> {
  effect: EvaluateEffect;
  result: EvaluationResult<T>;
}

export class EvaluateHandler implements Handler<EvaluateHandlerInput, EvaluateHandlerOutput> {
  private state: StateValues;
  private callbackId: number;
  // FIXME: Hash queries to prevent duplicate subscriptions
  private subscriptions: Map<Hash, QuerySubscription<any>> = new Map();
  private activeEffects: Map<StateToken, Effect> = new Map();

  constructor(options: { callbackId: ProcessId; state?: StateValues }) {
    const { callbackId, state } = options;
    this.state = state ?? new Map();
    this.callbackId = callbackId;
  }

  public handle({ message }: EvaluateHandlerInput): EvaluateHandlerOutput {
    switch (message.type) {
      case MESSAGE_SUBSCRIBE_EFFECTS:
        return this.handleSubscribeEffects(message);
      case MESSAGE_UNSUBSCRIBE_EFFECTS:
        return this.handleUnsubscribeEffects(message);
    }
  }

  private handleSubscribeEffects(message: SubscribeEffectsMessage): EvaluateHandlerOutput {
    const { effects } = message;
    const evaluateEffects = getTypedEffects<EvaluateEffect>(EFFECT_TYPE_EVALUATE, effects);
    if (!evaluateEffects || evaluateEffects.length === 0) return [];
    const { results, subscribedEffects, unsubscribedEffects } = evaluateEffects.reduce(
      (combinedResults, effect) => {
        // Subscribe to the provided evaluation root
        const {
          result,
          subscribed: subscribedEffects,
          unsubscribed: unsubscribedEffects,
        } = this.subscribe(effect);
        // If the result is already available, ensure it is re-emitted in this result set
        if (EvaluationResult.Ready.is(result)) {
          results.set(hash(effect), { value: result.value, dependencies: result.dependencies });
        }
        // Keep track of any effect subscriptions that were added or removed as a result of this evaluation
        combinedResults.subscribedEffects.push(...subscribedEffects);
        combinedResults.unsubscribedEffects.push(...unsubscribedEffects);
        return combinedResults;
      },
      {
        results: new Map<Hash, { value: unknown; dependencies: DependencyTree }>(),
        subscribedEffects: new Array<Effect>(),
        unsubscribedEffects: new Array<Effect>(),
      },
    );
    return this.createSubscriptionActions({
      results,
      subscribedEffects,
      unsubscribedEffects,
    });
  }

  private handleUnsubscribeEffects(message: UnsubscribeEffectsMessage): EvaluateHandlerOutput {
    const { effects } = message;
    const typedEffects = getTypedEffects<EvaluateEffect>(EFFECT_TYPE_EVALUATE, effects);
    if (!typedEffects || typedEffects.length === 0) return [];
    const { subscribedEffects, unsubscribedEffects } = typedEffects.reduce(
      (combinedResults, effect) => {
        // Unsubscribe from the provided evaluation root
        const { subscribedEffects, unsubscribedEffects } = this.unsubscribe(effect);
        // Keep track of any effect subscriptions that were added or removed as a result of unsubscribing from this evaluation
        combinedResults.subscribedEffects.push(...subscribedEffects);
        combinedResults.unsubscribedEffects.push(...unsubscribedEffects);
        return combinedResults;
      },
      {
        subscribedEffects: new Array<Effect>(),
        unsubscribedEffects: new Array<Effect>(),
      },
    );
    return this.createSubscriptionActions({
      results: null,
      subscribedEffects,
      unsubscribedEffects,
    });
  }

  private createSubscriptionActions(options: {
    results: Map<Hash, { value: unknown; dependencies: DependencyTree }> | null;
    subscribedEffects: Array<Effect>;
    unsubscribedEffects: Array<Effect>;
  }): EvaluateHandlerOutput {
    const { results, subscribedEffects, unsubscribedEffects } = options;
    const subscribeEffectsAction =
      subscribedEffects.length > 0
        ? HandlerAction.Send(
            this.callbackId,
            createSubscribeEffectsMessage(groupEffectsByType(subscribedEffects)),
          )
        : null;
    const unsubscribeEffectsAction =
      unsubscribedEffects.length > 0
        ? HandlerAction.Send(
            this.callbackId,
            createUnsubscribeEffectsMessage(groupEffectsByType(unsubscribedEffects)),
          )
        : null;
    const emitResultsAction =
      results && results.size > 0
        ? HandlerAction.Send(this.callbackId, createEmitEffectValuesMessage(results))
        : null;
    return [
      ...(subscribeEffectsAction ? [subscribeEffectsAction] : []),
      ...(unsubscribeEffectsAction ? [unsubscribeEffectsAction] : []),
      ...(emitResultsAction ? [emitResultsAction] : []),
    ];
  }

  private subscribe(effect: EvaluateEffect): {
    result: EvaluationResult<unknown>;
    subscribed: Array<Effect>;
    unsubscribed: Array<Effect>;
  } {
    const { expression } = effect.payload;
    const expressionId = hash(expression);
    // Get or create a subscription for the provided expression,
    // tracking any existing dependencies if the expression already exists
    const existingSubscription = this.subscriptions.get(expressionId);
    const previousDependencies = existingSubscription?.result.dependencies ?? null;
    // If the subscription already exists, get the existing result,
    // otherwise evaluate the expression and store it as the subscription result
    const subscription = existingSubscription || {
      effect,
      result: evaluate(expression, this.state),
    };
    if (!existingSubscription) this.subscriptions.set(expressionId, subscription);
    const { result } = subscription;
    // If the subscription already exists, no need to subscribe to any new effects
    if (existingSubscription) {
      return { result, subscribed: [], unsubscribed: [] };
    }
    const updatedDependencies = result.dependencies;
    // Register any effect subscriptions that have been created or removed as a result of this evaluation
    const { subscribedEffects, unsubscribedEffects } = this.updateActiveEffects(
      subscription,
      updatedDependencies,
      previousDependencies,
    );
    return {
      result,
      subscribed: subscribedEffects,
      unsubscribed: unsubscribedEffects,
    };
  }

  private unsubscribe(effect: EvaluateEffect): {
    result: EvaluationResult<unknown> | null;
    subscribedEffects: Array<Effect>;
    unsubscribedEffects: Array<Effect>;
  } {
    const { expression } = effect.payload;
    const expressionId = hash(expression);
    const subscription = this.subscriptions.get(expressionId);
    if (!subscription) return { result: null, subscribedEffects: [], unsubscribedEffects: [] };
    this.subscriptions.delete(expressionId);
    const { result } = subscription;
    const previousDependencies = result.dependencies;
    const updatedDependencies = EMPTY_DEPENDENCIES;
    // Register any effect subscriptions that have been created or removed as a result of unsubscribing from this evaluation
    const { subscribedEffects, unsubscribedEffects } = this.updateActiveEffects(
      subscription,
      updatedDependencies,
      previousDependencies,
    );
    return {
      result,
      subscribedEffects,
      unsubscribedEffects,
    };
  }

  private updateActiveEffects(
    subscription: QuerySubscription<any>,
    updatedDependencies: DependencyTree,
    previousDependencies: DependencyTree | null,
  ): { subscribedEffects: any; unsubscribedEffects: any } {
    const { subscribedEffects, unsubscribedEffects } = getEvaluationResultEffectSubscriptionUpdates(
      subscription,
      updatedDependencies,
      previousDependencies,
      this.activeEffects,
      this.subscriptions,
    );
    for (const effect of subscribedEffects) {
      this.activeEffects.set(effect[EFFECT], effect);
    }
    for (const effect of unsubscribedEffects) {
      this.activeEffects.delete(effect[EFFECT]);
    }
    return { subscribedEffects, unsubscribedEffects };
  }
}

function getEvaluationResultEffectSubscriptionUpdates(
  subscription: QuerySubscription<any>,
  updatedDependencies: DependencyTree,
  previousDependencies: DependencyTree | null,
  effectsLookup: Map<StateToken, Effect>,
  subscriptions: Map<any, QuerySubscription<any>>,
): { subscribedEffects: Array<Effect>; unsubscribedEffects: Array<Effect> } {
  // Determine the set of effects that have been subscribed or unsubscribed as a result of this evaluation
  const { result } = subscription;
  const unresolvedEffects = EvaluationResult.Pending.is(result)
    ? flattenConditionTree(result.conditions)
    : null;
  const { added: addedDependencies, removed: removedDependencies } = getUpdatedDependencies(
    subscription,
    updatedDependencies,
    previousDependencies,
    subscriptions,
  );
  const subscribedEffects = unresolvedEffects
    ? addedDependencies.map((dependency) => unresolvedEffects.get(dependency)).filter(nonNull)
    : [];
  const unsubscribedEffects = removedDependencies
    .map((dependency) => effectsLookup.get(dependency))
    .filter(nonNull);
  return { subscribedEffects, unsubscribedEffects };
}

function getUpdatedDependencies(
  subscription: QuerySubscription<any>,
  updatedDependencies: DependencyTree,
  previousDependencies: DependencyTree | null,
  allSubscriptions: Map<Reactive<any>, QuerySubscription<any>>,
): { added: Array<StateToken>; removed: Array<StateToken> } {
  // FIXME: optimize expensive dependency operations
  const previousDependencySet = previousDependencies && flattenDependencyTree(previousDependencies);
  const updatedDependencySet = flattenDependencyTree(updatedDependencies);
  const addedDependencies = previousDependencySet
    ? Array.from(updatedDependencySet).filter(
        (dependency) => !previousDependencySet.has(dependency),
      )
    : Array.from(updatedDependencySet);
  const removedDependencies = previousDependencySet
    ? Array.from(previousDependencySet).filter(
        (dependency) => !updatedDependencySet.has(dependency),
      )
    : new Array<StateToken>();
  if (addedDependencies.length === 0 && removedDependencies.length === 0) {
    return { added: [], removed: [] };
  }
  const otherSubscriptions = Array.from(allSubscriptions.values()).filter(
    (existingSubscription) => existingSubscription !== subscription,
  );
  const otherSubscriptionDependencies = flattenDependencyTree(
    DependencyTree.Multiple({
      children: otherSubscriptions.map(({ result }) => result.dependencies),
    }),
  );
  return {
    added: Array.from(addedDependencies).filter(
      (dependency) => !otherSubscriptionDependencies.has(dependency),
    ),
    removed: Array.from(removedDependencies).filter(
      (dependency) => !otherSubscriptionDependencies.has(dependency),
    ),
  };
}
