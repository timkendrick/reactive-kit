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
  protected readonly effectType: T['type'];
  protected readonly next: ActorHandle<EffectHandlerOutputMessage>;

  protected constructor(effectType: T['type'], next: ActorHandle<EffectHandlerOutputMessage>) {
    this.effectType = effectType;
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
    if (isSubscribeEffectsMessage(message)) return message.effects.has(this.effectType);
    if (isUnsubscribeEffectsMessage(message)) return message.effects.has(this.effectType);
    if (this.acceptInternal(message)) return true;
    return false;
  }

  private handleSubscribeEffects(
    message: SubscribeEffectsMessage,
    context: HandlerContext<EffectHandlerInput<TInternal>>,
  ): EffectHandlerOutput<TInternal> {
    const { effects } = message;
    const typedEffects = getTypedEffects<T>(this.effectType, effects);
    if (!typedEffects || typedEffects.length === 0) return null;
    const initialValues = new Map(
      typedEffects
        .map((effect): [EffectId, Expression<any>] | null => {
          const stateToken = effect.id;
          const initialValue = this.getInitialValue(effect);
          return [stateToken, initialValue ?? createPending()];
        })
        .filter(nonNull),
    );
    const actions = typedEffects
      .map((effect) => this.onSubscribe(effect, context))
      .filter(nonNull)
      .flat();
    const initialValuesMessage =
      initialValues.size === 0
        ? null
        : createEmitEffectValuesMessage(new Map([[this.effectType, initialValues]]));
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
    const typedEffects = getTypedEffects<T>(this.effectType, effects);
    if (!typedEffects || typedEffects.length === 0) return null;
    const actions = typedEffects
      .map((effect) => this.onUnsubscribe(effect, context))
      .filter(nonNull)
      .flat();
    if (actions.length === 0) return null;
    return actions;
  }

  protected emit(
    values: Map<EffectId, Expression<any>>,
  ): HandlerAction<EffectHandlerOutputMessage> {
    const effectValues = new Map([[this.effectType, values]]);
    const emitMessage = createEmitEffectValuesMessage(effectValues);
    return HandlerAction.Send(this.next, emitMessage);
  }
}
