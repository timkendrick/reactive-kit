import {
  HandlerAction,
  type Actor,
  type ActorHandle,
  type HandlerContext,
  type HandlerResult,
  type SyncActorFactory,
} from '@reactive-kit/actor';
import { hash, isHashable, type Hash, type Hashable } from '@reactive-kit/hash';
import { Interpreter, type InterpreterSubscription } from '@reactive-kit/interpreter';
import {
  EvaluationResultType,
  type EffectExpression,
  type EffectId,
  type EvaluationErrorResult,
  type EvaluationResult,
  type EvaluationSuccessResult,
  type Expression,
  type ResultExpression,
} from '@reactive-kit/types';

import { EFFECT_TYPE_EVALUATE, type EvaluateEffect } from '../effects';
import {
  MESSAGE_EMIT_EFFECT_VALUES,
  MESSAGE_SUBSCRIBE_EFFECTS,
  MESSAGE_UNSUBSCRIBE_EFFECTS,
  createEmitEffectValuesMessage,
  createSubscribeEffectsMessage,
  createUnsubscribeEffectsMessage,
  isEmitEffectValuesMessage,
  isSubscribeEffectsMessage,
  isUnsubscribeEffectsMessage,
  type EmitEffectValuesMessage,
  type SubscribeEffectsMessage,
  type UnsubscribeEffectsMessage,
} from '../messages';
import type { Message } from '../types';
import { getTypedEffects, groupEffectsByType } from '../utils';

export const ACTOR_TYPE_EVALUATE_HANDLER = '@reactive-kit/actor/evaluate-handler';

type EvaluateHandlerInputMessage =
  | SubscribeEffectsMessage
  | UnsubscribeEffectsMessage
  | EmitEffectValuesMessage;
type EvaluateHandlerOutputMessage =
  | SubscribeEffectsMessage
  | UnsubscribeEffectsMessage
  | EmitEffectValuesMessage;

type EvaluateHandlerInput = EvaluateHandlerInputMessage;
type EvaluateHandlerOutput = HandlerResult<EvaluateHandlerOutputMessage>;

export type ReadyEvaluationResult<T> = ResultExpression<T>;
export type StateValues = Map<EffectId, Expression<unknown>>;

interface EvaluateHandlerSubscription<T> {
  effect: EvaluateEffect<T>;
  subscription: InterpreterSubscription<T>;
  result: EvaluationResult<T>;
}

export interface EvaluateHandlerConfig {
  state: StateValues | null;
  next: ActorHandle<EvaluateHandlerOutputMessage>;
}

export class EvaluateHandler
  implements Actor<Message<unknown, unknown>, Message<unknown, unknown>>
{
  private readonly next: ActorHandle<EvaluateHandlerOutputMessage>;
  private effectState: StateValues;
  private interpreter: Interpreter;
  private subscriptions: Map<Hash, EvaluateHandlerSubscription<Hashable>>;

  public static readonly FACTORY: SyncActorFactory<
    EvaluateHandlerConfig,
    Message<unknown, unknown>,
    Message<unknown, unknown>
  > = {
    type: ACTOR_TYPE_EVALUATE_HANDLER,
    async: false,
    factory: (config: EvaluateHandlerConfig, _self: ActorHandle<Message<unknown, unknown>>) =>
      new EvaluateHandler(config),
  };

  public constructor(config: EvaluateHandlerConfig) {
    const { state, next } = config;
    this.effectState = state ?? new Map();
    this.interpreter = new Interpreter();
    this.subscriptions = new Map();
    this.next = next;
  }

  public handle(
    message: Message<unknown, unknown>,
    context: HandlerContext<EvaluateHandlerInput>,
  ): EvaluateHandlerOutput {
    if (!this.accept(message)) return null;
    switch (message.type) {
      case MESSAGE_SUBSCRIBE_EFFECTS:
        return this.handleSubscribeEffects(message, context);
      case MESSAGE_UNSUBSCRIBE_EFFECTS:
        return this.handleUnsubscribeEffects(message, context);
      case MESSAGE_EMIT_EFFECT_VALUES:
        return this.handleEmitEffectValues(message, context);
    }
  }

  private accept(message: Message<unknown, unknown>): message is EvaluateHandlerInput {
    if (isEmitEffectValuesMessage(message)) return true;
    if (isSubscribeEffectsMessage(message))
      return message.payload.effects.has(EFFECT_TYPE_EVALUATE);
    if (isUnsubscribeEffectsMessage(message))
      return message.payload.effects.has(EFFECT_TYPE_EVALUATE);
    return false;
  }

  private handleSubscribeEffects(
    message: SubscribeEffectsMessage,
    _context: HandlerContext<EvaluateHandlerInput>,
  ): EvaluateHandlerOutput {
    const { effects } = message.payload;
    const typedEffects = getTypedEffects<EvaluateEffect<Hashable>>(EFFECT_TYPE_EVALUATE, effects);
    if (!typedEffects || typedEffects.length === 0) return null;
    const addedSubscriptions = typedEffects.flatMap((effect) => {
      const { expression } = effect.payload;
      const expressionHash = hash(expression);
      if (this.subscriptions.has(expressionHash)) return [];
      const subscription = this.interpreter.subscribe(expression);
      const { result, effects } = this.interpreter.evaluate(subscription, this.effectState);
      const entry = { effect, subscription, result };
      this.subscriptions.set(expressionHash, entry);
      return [{ entry, effects }];
    });
    const { newlySubscribedEffects, emittedValues } = addedSubscriptions.reduce(
      (combinedResults, { entry, effects }) => {
        const { newlySubscribedEffects, emittedValues } = combinedResults;
        const { effect, result } = entry;
        for (const unresolvedEffect of effects) {
          newlySubscribedEffects.add(unresolvedEffect);
        }
        switch (result.type) {
          case EvaluationResultType.Pending: {
            break;
          }
          case EvaluationResultType.Error:
          case EvaluationResultType.Success: {
            emittedValues.set(effect.id, parseInterpreterResultValue(result));
            break;
          }
        }
        return combinedResults;
      },
      {
        newlySubscribedEffects: new Set<EffectExpression<unknown>>(),
        emittedValues: new Map<Hash, Expression<unknown>>(),
      },
    );
    const subscribeEffectsAction =
      newlySubscribedEffects.size > 0
        ? HandlerAction.Send({
            target: this.next,
            message: createSubscribeEffectsMessage({
              effects: groupEffectsByType(newlySubscribedEffects),
            }),
          })
        : null;
    const emitResultsAction =
      emittedValues.size > 0
        ? HandlerAction.Send({
            target: this.next,
            message: createEmitEffectValuesMessage({
              updates: new Map([[EFFECT_TYPE_EVALUATE, emittedValues]]),
            }),
          })
        : null;
    const combinedActions = [
      ...(subscribeEffectsAction ? [subscribeEffectsAction] : []),
      ...(emitResultsAction ? [emitResultsAction] : []),
    ];
    return combinedActions.length === 0 ? null : combinedActions;
  }

  private handleUnsubscribeEffects(
    message: UnsubscribeEffectsMessage,
    _context: HandlerContext<EvaluateHandlerInput>,
  ): EvaluateHandlerOutput {
    // FIXME: Ensure top-level evaluations are not unsubscribed due to a different query unsubscribing a sub-query for the same evaluation
    const { effects } = message.payload;
    const typedEffects = getTypedEffects<EvaluateEffect<unknown>>(EFFECT_TYPE_EVALUATE, effects);
    if (!typedEffects || typedEffects.length === 0) return null;
    const removedSubscriptions = typedEffects.flatMap((effect) => {
      const { expression } = effect.payload;
      const expressionHash = hash(expression);
      const subscription = this.subscriptions.get(expressionHash);
      if (!subscription) return [];
      this.subscriptions.delete(expressionHash);
      return [subscription.subscription];
    });
    if (removedSubscriptions.length === 0) return null;
    const newlyUnsubscribedEffects = this.interpreter.unsubscribe(removedSubscriptions);
    for (const effect of newlyUnsubscribedEffects) {
      this.effectState.delete(effect.id);
    }
    const unsubscribeEffectsAction =
      newlyUnsubscribedEffects.size > 0
        ? HandlerAction.Send({
            target: this.next,
            message: createUnsubscribeEffectsMessage({
              effects: groupEffectsByType(newlyUnsubscribedEffects),
            }),
          })
        : null;
    const combinedActions = unsubscribeEffectsAction ? [unsubscribeEffectsAction] : [];
    return combinedActions.length === 0 ? null : combinedActions;
  }

  private handleEmitEffectValues(
    message: EmitEffectValuesMessage,
    _context: HandlerContext<EvaluateHandlerInput>,
  ): EvaluateHandlerOutput {
    const { updates } = message.payload;
    for (const typedUpdates of updates.values()) {
      for (const [id, value] of typedUpdates) {
        // Store the updated effect value in the handler state
        this.effectState.set(id, value);
        // Invalidate the interpreter evaluation cache for the effect
        this.interpreter.invalidate(id);
      }
    }
    const { newlySubscribedEffects, emittedValues } = Array.from(
      this.subscriptions.values(),
    ).reduce(
      (combinedResults, entry) => {
        const { newlySubscribedEffects, emittedValues } = combinedResults;
        const { effect, subscription, result: existingResult } = entry;
        const { result: updatedResult, effects } = this.interpreter.evaluate(
          subscription,
          this.effectState,
        );
        entry.result = updatedResult;
        for (const unresolvedEffect of effects) {
          newlySubscribedEffects.add(unresolvedEffect);
        }
        switch (updatedResult.type) {
          case EvaluationResultType.Pending: {
            break;
          }
          case EvaluationResultType.Error:
          case EvaluationResultType.Success: {
            const hasChanged =
              existingResult.type === EvaluationResultType.Pending ||
              !isEqualInterpreterResult(existingResult, updatedResult);
            if (hasChanged) {
              emittedValues.set(effect.id, parseInterpreterResultValue(updatedResult));
            }
            break;
          }
        }
        return combinedResults;
      },
      {
        newlySubscribedEffects: new Set<EffectExpression<unknown>>(),
        emittedValues: new Map<Hash, Expression<unknown>>(),
      },
    );
    const newlyUnsubscribedEffects = this.interpreter.gc();
    for (const effect of newlyUnsubscribedEffects) {
      this.effectState.delete(effect.id);
    }
    const subscribeEffectsAction =
      newlySubscribedEffects.size > 0
        ? HandlerAction.Send({
            target: this.next,
            message: createSubscribeEffectsMessage({
              effects: groupEffectsByType(newlySubscribedEffects),
            }),
          })
        : null;
    const unsubscribeEffectsAction =
      newlyUnsubscribedEffects.size > 0
        ? HandlerAction.Send({
            target: this.next,
            message: createUnsubscribeEffectsMessage({
              effects: groupEffectsByType(newlyUnsubscribedEffects),
            }),
          })
        : null;
    const emitResultsAction =
      emittedValues.size > 0
        ? HandlerAction.Send({
            target: this.next,
            message: createEmitEffectValuesMessage({
              updates: new Map([[EFFECT_TYPE_EVALUATE, emittedValues]]),
            }),
          })
        : null;
    const combinedActions = [
      ...(subscribeEffectsAction ? [subscribeEffectsAction] : []),
      ...(unsubscribeEffectsAction ? [unsubscribeEffectsAction] : []),
      ...(emitResultsAction ? [emitResultsAction] : []),
    ];
    return combinedActions.length === 0 ? null : combinedActions;
  }
}

function isEqualInterpreterResult<T>(
  left: EvaluationErrorResult | EvaluationSuccessResult<T>,
  right: EvaluationErrorResult | EvaluationSuccessResult<T>,
): boolean {
  if (left.type === EvaluationResultType.Error) {
    return (
      right.type === EvaluationResultType.Error &&
      EvaluationEqualInterpreterErrorResult(left, right)
    );
  }
  if (left.type === EvaluationResultType.Success) {
    return (
      right.type === EvaluationResultType.Success &&
      EvaluationEqualInterpreterSuccessResult(left, right)
    );
  }
  return false;
}

function EvaluationEqualInterpreterSuccessResult<T>(
  left: EvaluationSuccessResult<T>,
  right: EvaluationSuccessResult<T>,
): boolean {
  return isEqualMaybeHashable(left.result, right.result);
}

function EvaluationEqualInterpreterErrorResult(
  left: EvaluationErrorResult,
  right: EvaluationErrorResult,
): boolean {
  return isEqualMaybeHashable(left.error, right.error);
}

function parseInterpreterResultValue<T>(
  result: EvaluationErrorResult | EvaluationSuccessResult<T>,
): Expression<unknown> {
  switch (result.type) {
    case EvaluationResultType.Success:
      return result.result;
    case EvaluationResultType.Error:
      return result.error;
  }
}

function isEqualMaybeHashable<T extends Hashable | unknown>(left: T, right: T): boolean {
  if (left === right) return true;
  return isHashable(left) && isHashable(right) && hash(left) === hash(right);
}
