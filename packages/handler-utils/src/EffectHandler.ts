import {
  HandlerAction,
  type Actor,
  type ActorHandle,
  type HandlerContext,
  type HandlerResult,
} from '@reactive-kit/actor';
import {
  createEmitEffectValuesMessage,
  getTypedEffects,
  isSubscribeEffectsMessage,
  isUnsubscribeEffectsMessage,
  type EmitEffectValuesMessage,
  type Message,
  type SubscribeEffectsMessage,
  type UnsubscribeEffectsMessage,
} from '@reactive-kit/runtime-messages';
import {
  type EffectExpression,
  type Expression,
  type EffectId,
  createPending,
} from '@reactive-kit/types';
import { nonNull } from '@reactive-kit/utils';

export type EffectHandlerInputMessage = SubscribeEffectsMessage | UnsubscribeEffectsMessage;
export type EffectHandlerOutputMessage = EmitEffectValuesMessage;

export type EffectHandlerInput<TInternal extends Message<unknown>> =
  | EffectHandlerInputMessage
  | TInternal;
export type EffectHandlerOutput<TInternal extends Message<unknown>> = HandlerResult<
  EffectHandlerOutputMessage | TInternal
>;

export abstract class EffectHandler<
  T extends EffectExpression<unknown>,
  TInternal extends Message<unknown>,
> implements Actor<Message<unknown>>
{
  protected readonly effectTypes: Set<T['type']>;
  protected readonly next: ActorHandle<EffectHandlerOutputMessage>;

  protected constructor(
    effectTypes: T['type'] | T['type'][],
    next: ActorHandle<EffectHandlerOutputMessage>,
  ) {
    this.effectTypes = new Set(Array.isArray(effectTypes) ? effectTypes : [effectTypes]);
    this.next = next;
  }

  protected abstract getInitialValue(effect: T): Expression<any> | null;

  protected abstract onSubscribe(
    effect: T,
    context: HandlerContext<EffectHandlerInput<TInternal>>,
  ): EffectHandlerOutput<TInternal>;

  protected abstract onUnsubscribe(
    effect: T,
    context: HandlerContext<EffectHandlerInput<TInternal>>,
  ): EffectHandlerOutput<TInternal>;

  protected abstract acceptInternal(message: Message<unknown>): message is TInternal;

  protected abstract handleInternal(
    message: Message<unknown>,
    context: HandlerContext<EffectHandlerInput<TInternal>>,
  ): EffectHandlerOutput<TInternal>;

  public handle(
    message: Message<unknown>,
    context: HandlerContext<EffectHandlerInput<TInternal>>,
  ): EffectHandlerOutput<TInternal> {
    if (!this.accept(message)) return null;
    if (isSubscribeEffectsMessage(message)) {
      return this.handleSubscribeEffects(message, context);
    }
    if (isUnsubscribeEffectsMessage(message)) {
      return this.handleUnsubscribeEffects(message, context);
    }
    return this.handleInternal(message, context);
  }

  private accept(message: Message<unknown>): message is EffectHandlerInput<TInternal> {
    if (isSubscribeEffectsMessage(message)) {
      return Array.from(message.effects.keys()).some((type) => this.effectTypes.has(type));
    }
    if (isUnsubscribeEffectsMessage(message)) {
      return Array.from(message.effects.keys()).some((type) => this.effectTypes.has(type));
    }
    if (this.acceptInternal(message)) return true;
    return false;
  }

  private handleSubscribeEffects(
    message: SubscribeEffectsMessage,
    context: HandlerContext<EffectHandlerInput<TInternal>>,
  ): EffectHandlerOutput<TInternal> {
    const { effects } = message;
    const effectsByType = new Map<T['type'], T[]>();

    for (const effectType of this.effectTypes) {
      const typedEffects = getTypedEffects<T>(effectType, effects);
      if (typedEffects && typedEffects.length > 0) {
        effectsByType.set(effectType, typedEffects);
      }
    }

    if (effectsByType.size === 0) return null;

    const initialValuesByType = new Map<T['type'], Map<EffectId, Expression<any>>>();

    for (const [effectType, typedEffects] of effectsByType) {
      const initialValues = new Map(
        typedEffects
          .map((effect): [EffectId, Expression<any>] | null => {
            const stateToken = effect.id;
            const initialValue = this.getInitialValue(effect);
            return [stateToken, initialValue ?? createPending()];
          })
          .filter(nonNull),
      );
      if (initialValues.size > 0) {
        initialValuesByType.set(effectType, initialValues);
      }
    }

    const actions = Array.from(effectsByType.values())
      .flat()
      .map((effect) => this.onSubscribe(effect, context))
      .filter(nonNull)
      .flat();

    const initialValuesMessage =
      initialValuesByType.size === 0 ? null : createEmitEffectValuesMessage(initialValuesByType);

    const initialValueActions =
      initialValuesMessage != null ? [HandlerAction.Send(this.next, initialValuesMessage)] : [];

    const combinedActions = [...initialValueActions, ...actions];
    return combinedActions.length === 0 ? null : combinedActions;
  }

  private handleUnsubscribeEffects(
    message: UnsubscribeEffectsMessage,
    context: HandlerContext<EffectHandlerInput<TInternal>>,
  ): EffectHandlerOutput<TInternal> {
    const { effects } = message;
    const allTypedEffects = Array.from(this.effectTypes)
      .map((effectType) => getTypedEffects<T>(effectType, effects))
      .filter(nonNull)
      .flat();

    if (allTypedEffects.length === 0) return null;

    const actions = allTypedEffects
      .map((effect) => this.onUnsubscribe(effect, context))
      .filter(nonNull)
      .flat();

    if (actions.length === 0) return null;
    return actions;
  }

  protected emit(
    effectType: T['type'],
    values: Map<EffectId, Expression<any>>,
  ): HandlerAction<EffectHandlerOutputMessage> {
    const effectValues = new Map([[effectType, values]]);
    const emitMessage = createEmitEffectValuesMessage(effectValues);
    return HandlerAction.Send(this.next, emitMessage);
  }
}
