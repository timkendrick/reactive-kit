import {
  Reactive,
  StateValues,
  StateToken,
  Effect,
  Handler,
  HandlerResult,
  ProcessId,
  HandlerAction,
  HandlerInput,
  SIGNAL,
  EffectType,
} from '@trigger/types';
import { Enum, EnumVariant, match, nonNull } from '@trigger/utils';
import {
  EMPTY_DEPENDENCIES,
  DependencyTree,
  flattenConditionTree,
  flattenDependencyTree,
  EvaluationResult,
  evaluate,
  groupEffectsByType,
} from '../utils';

export type EvaluateHandlerMessage = Enum<{
  Subscribe: {
    expression: Reactive<any>;
  };
  Unsubscribe: {
    expression: Reactive<any>;
  };
  SubscribeEffects: {
    effects: Map<EffectType, Array<Effect>>;
  };
  UnsubscribeEffects: {
    effects: Map<EffectType, Array<Effect>>;
  };
  EmitResult: {
    expression: Reactive<any>;
    result: EvaluationResult<any>;
  };
  EmitEffectValues: {
    values: Map<StateToken, Reactive<any>>;
  };
}>;

export const EvaluateHandlerMessage = Enum.create<EvaluateHandlerMessage>({
  Subscribe: true,
  Unsubscribe: true,
  SubscribeEffects: true,
  UnsubscribeEffects: true,
  EmitResult: true,
  EmitEffectValues: true,
});

export type EvaluateHandlerSubscribeMessage = EnumVariant<EvaluateHandlerMessage, 'Subscribe'>;
export type EvaluateHandlerUnsubscribeMessage = EnumVariant<EvaluateHandlerMessage, 'Unsubscribe'>;
export type EvaluateHandlerSubscribeEffectsMessage = EnumVariant<
  EvaluateHandlerMessage,
  'SubscribeEffects'
>;
export type EvaluateHandlerUnsubscribeEffectsMessage = EnumVariant<
  EvaluateHandlerMessage,
  'UnsubscribeEffects'
>;
export type EvaluateHandlerEmitResultMessage = EnumVariant<EvaluateHandlerMessage, 'EmitResult'>;
export type EvaluateHandlerEmitEffectValuesMessage = EnumVariant<
  EvaluateHandlerMessage,
  'EmitEffectValues'
>;

type EvaluateHandlerInputMessage =
  | EvaluateHandlerSubscribeMessage
  | EvaluateHandlerUnsubscribeMessage;
type EvaluateHandlerOutputMessage =
  | EvaluateHandlerSubscribeEffectsMessage
  | EvaluateHandlerUnsubscribeEffectsMessage
  | EvaluateHandlerEmitResultMessage;

type EvaluateHandlerInput = HandlerInput<EvaluateHandlerInputMessage>;
type EvaluateHandlerOutput = HandlerResult<EvaluateHandlerOutputMessage>;

interface QuerySubscription<T> {
  result: EvaluationResult<T>;
}

export const EVALUATE_SIGNAL_TYPE = '@trigger/evaluate';

export class EvaluateHandler implements Handler<EvaluateHandlerInput, EvaluateHandlerOutput> {
  private state: StateValues;
  private callbackId: number;
  // FIXME: Hash queries to prevent duplicate subscriptions
  private subscriptions: Map<Reactive<any>, QuerySubscription<any>> = new Map();
  private activeEffects: Map<StateToken, Effect> = new Map();

  constructor(options: { callbackId: ProcessId; state?: StateValues }) {
    const { callbackId, state } = options;
    this.state = state ?? new Map();
    this.callbackId = callbackId;
  }

  public handle({ message }: EvaluateHandlerInput): EvaluateHandlerOutput {
    return match(message, {
      Subscribe: (message) => this.handleSubscribe(message),
      Unsubscribe: (message) => this.handleUnsubscribe(message),
    });
  }

  private handleSubscribe(message: EvaluateHandlerSubscribeMessage): EvaluateHandlerOutput {
    const { expression } = message;
    // Get or create a subscription for the provided expression,
    // tracking any existing dependencies if the expression already exists
    const existingSubscription = this.subscriptions.get(expression);
    const previousDependencies = existingSubscription?.result.dependencies ?? null;
    // If the subscription already exists, get the existing result,
    // otherwise evaluate the expression and store it as the subscription result
    const subscription = existingSubscription || { result: evaluate(expression, this.state) };
    const { result } = subscription;
    // If the result is already available, prepare to emit it immediately
    const emitResultAction = EvaluationResult.Ready.is(result)
      ? HandlerAction.Send(
          this.callbackId,
          EvaluateHandlerMessage.EmitResult({
            expression,
            result: result.value,
          }),
        )
      : null;
    // If the subscription already exists, no need to subscribe to any new effects
    if (existingSubscription) {
      return emitResultAction ? [emitResultAction] : [];
    }
    const { subscribed: subscribedEffects, unsubscribed: unsubscribedEffects } =
      getEvaluationResultEffectSubscriptionActions(
        subscription,
        subscription.result.dependencies,
        previousDependencies,
        this.activeEffects,
        this.subscriptions,
      );
    for (const effect of unsubscribedEffects) {
      this.activeEffects.delete(effect[SIGNAL]);
    }
    for (const effect of subscribedEffects) {
      this.activeEffects.set(effect[SIGNAL], effect);
    }
    const subscribeEffectsAction =
      subscribedEffects.length > 0
        ? HandlerAction.Send(
            this.callbackId,
            EvaluateHandlerMessage.SubscribeEffects({
              effects: groupEffectsByType(subscribedEffects),
            }),
          )
        : null;
    const unsubscribeEffectsAction =
      unsubscribedEffects.length > 0
        ? HandlerAction.Send(
            this.callbackId,
            EvaluateHandlerMessage.UnsubscribeEffects({
              effects: groupEffectsByType(unsubscribedEffects),
            }),
          )
        : null;
    return [
      ...(subscribeEffectsAction ? [subscribeEffectsAction] : []),
      ...(unsubscribeEffectsAction ? [unsubscribeEffectsAction] : []),
      ...(emitResultAction ? [emitResultAction] : []),
    ];
  }

  private handleUnsubscribe(message: EvaluateHandlerUnsubscribeMessage): EvaluateHandlerOutput {
    const { expression } = message;
    const subscription = this.subscriptions.get(expression);
    if (!subscription) return [];
    const previousDependencies = subscription.result.dependencies;
    const updatedDependencies = EMPTY_DEPENDENCIES;
    const { unsubscribed: unsubscribedEffects } = getEvaluationResultEffectSubscriptionActions(
      subscription,
      updatedDependencies,
      previousDependencies,
      this.activeEffects,
      this.subscriptions,
    );
    if (unsubscribedEffects.length === 0) return [];
    for (const effect of unsubscribedEffects) {
      this.activeEffects.delete(effect[SIGNAL]);
    }
    const unsubscribeEffectsAction =
      unsubscribedEffects.length > 0
        ? HandlerAction.Send(
            this.callbackId,
            EvaluateHandlerMessage.UnsubscribeEffects({
              effects: groupEffectsByType(unsubscribedEffects),
            }),
          )
        : null;
    return unsubscribeEffectsAction ? [unsubscribeEffectsAction] : [];
  }
}

function getEvaluationResultEffectSubscriptionActions(
  subscription: QuerySubscription<any>,
  updatedDependencies: DependencyTree,
  previousDependencies: DependencyTree | null,
  effectsLookup: Map<StateToken, Effect>,
  subscriptions: Map<any, QuerySubscription<any>>,
): { subscribed: Array<Effect>; unsubscribed: Array<Effect> } {
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
  return { subscribed: subscribedEffects, unsubscribed: unsubscribedEffects };
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
