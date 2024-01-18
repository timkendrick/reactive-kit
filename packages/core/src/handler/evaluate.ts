import {
  Reactive,
  StateValues,
  StateToken,
  Signal,
  Handler,
  HandlerResult,
  ProcessId,
  HandlerAction,
  HandlerInput,
  SIGNAL,
} from '@trigger/types';
import { Enum, EnumVariant, match, nonNull } from '@trigger/utils';
import {
  EMPTY_DEPENDENCIES,
  DependencyTree,
  flattenConditionTree,
  flattenDependencyTree,
  EvaluationResult,
  evaluate,
} from '../utils';

export type EvaluateHandlerMessage = Enum<{
  Subscribe: {
    expression: Reactive<any>;
  };
  Unsubscribe: {
    expression: Reactive<any>;
  };
  SubscribeEffects: {
    effects: Array<Signal<any>>;
  };
  UnsubscribeEffects: {
    effects: Array<Signal<any>>;
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

export class EvaluateHandler implements Handler<EvaluateHandlerInput, EvaluateHandlerOutput> {
  private state: StateValues;
  private callbackId: number;
  // FIXME: Hash queries to prevent duplicate subscriptions
  private subscriptions: Map<Reactive<any>, QuerySubscription<any>> = new Map();
  private activeSignals: Map<StateToken, Signal<any>> = new Map();

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
        this.activeSignals,
        this.subscriptions,
      );
    for (const effect of unsubscribedEffects) {
      this.activeSignals.delete(effect[SIGNAL]);
    }
    for (const effect of subscribedEffects) {
      this.activeSignals.set(effect[SIGNAL], effect);
    }
    const subscribeEffectsAction =
      subscribedEffects.length > 0
        ? HandlerAction.Send(
            this.callbackId,
            EvaluateHandlerMessage.SubscribeEffects({
              effects: subscribedEffects,
            }),
          )
        : null;
    const unsubscribeEffectsAction =
      unsubscribedEffects.length > 0
        ? HandlerAction.Send(
            this.callbackId,
            EvaluateHandlerMessage.UnsubscribeEffects({
              effects: unsubscribedEffects,
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
      this.activeSignals,
      this.subscriptions,
    );
    if (unsubscribedEffects.length === 0) return [];
    for (const effect of unsubscribedEffects) {
      this.activeSignals.delete(effect[SIGNAL]);
    }
    const unsubscribeEffectsAction =
      unsubscribedEffects.length > 0
        ? HandlerAction.Send(
            this.callbackId,
            EvaluateHandlerMessage.UnsubscribeEffects({
              effects: unsubscribedEffects,
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
  effectsLookup: Map<StateToken, Signal<any>>,
  subscriptions: Map<any, QuerySubscription<any>>,
): { subscribed: Array<Signal<any>>; unsubscribed: Array<Signal<any>> } {
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
