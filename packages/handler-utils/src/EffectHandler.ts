import {
  HandlerAction,
  type Actor,
  type ActorHandle,
  type HandlerContext,
  type HandlerResult,
} from '@reactive-kit/actor';
import type { Message } from '@reactive-kit/message';
import {
  createEmitEffectValuesMessage,
  getTypedEffects,
  isSubscribeEffectsMessage,
  isUnsubscribeEffectsMessage,
  type EmitEffectValuesMessage,
  type SubscribeEffectsMessage,
  type UnsubscribeEffectsMessage,
} from '@reactive-kit/plugin-evaluate';
import {
  createPending,
  type EffectExpression,
  type EffectId,
  type Expression,
} from '@reactive-kit/types';
import { nonNull } from '@reactive-kit/utils';

export type EffectHandlerInputMessage = SubscribeEffectsMessage | UnsubscribeEffectsMessage;
export type EffectHandlerOutputMessage = EmitEffectValuesMessage;

export type EffectHandlerInput<TInternal extends Message<unknown, unknown>> =
  | EffectHandlerInputMessage
  | TInternal;
export type EffectHandlerOutput<TInternal extends Message<unknown, unknown>> = HandlerResult<
  EffectHandlerOutputMessage | TInternal
>;

export abstract class EffectHandler<
  T extends EffectExpression<unknown>,
  TInternal extends Message<unknown, unknown>,
> implements Actor<Message<unknown, unknown>, EffectHandlerOutputMessage | TInternal>
{
  protected readonly effectTypes: Set<T['type']>;
  protected readonly next: ActorHandle<EffectHandlerOutputMessage>;

  protected constructor(
    effectTypes: T['type'] | Array<T['type']>,
    next: ActorHandle<EffectHandlerOutputMessage>,
  ) {
    this.effectTypes = new Set(Array.isArray(effectTypes) ? effectTypes : [effectTypes]);
    this.next = next;
  }

  protected abstract getInitialValue(effect: T): Expression<unknown> | null;

  protected abstract onSubscribe(
    effect: T,
    context: HandlerContext<EffectHandlerInput<TInternal>>,
  ): EffectHandlerOutput<TInternal>;

  protected abstract onUnsubscribe(
    effect: T,
    context: HandlerContext<EffectHandlerInput<TInternal>>,
  ): EffectHandlerOutput<TInternal>;

  protected abstract acceptInternal(message: Message<unknown, unknown>): message is TInternal;

  protected abstract handleInternal(
    message: Message<unknown, unknown>,
    context: HandlerContext<EffectHandlerInput<TInternal>>,
  ): EffectHandlerOutput<TInternal>;

  public handle(
    message: Message<unknown, unknown>,
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

  private accept(message: Message<unknown, unknown>): message is EffectHandlerInput<TInternal> {
    if (isSubscribeEffectsMessage(message)) {
      return Array.from(message.payload.effects.keys()).some((type) => this.effectTypes.has(type));
    }
    if (isUnsubscribeEffectsMessage(message)) {
      return Array.from(message.payload.effects.keys()).some((type) => this.effectTypes.has(type));
    }
    if (this.acceptInternal(message)) return true;
    return false;
  }

  private handleSubscribeEffects(
    message: SubscribeEffectsMessage,
    context: HandlerContext<EffectHandlerInput<TInternal>>,
  ): EffectHandlerOutput<TInternal> {
    const { effects } = message.payload;
    const effectsByType = new Map<T['type'], Array<T>>();

    for (const effectType of this.effectTypes) {
      const typedEffects = getTypedEffects<T>(effectType, effects);
      if (typedEffects && typedEffects.length > 0) {
        effectsByType.set(effectType, typedEffects);
      }
    }

    if (effectsByType.size === 0) return null;

    const initialValuesByType = new Map<T['type'], Map<EffectId, Expression<unknown>>>();

    for (const [effectType, typedEffects] of effectsByType) {
      const initialValues = new Map(
        typedEffects
          .map((effect): [EffectId, Expression<unknown>] | null => {
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
      initialValuesByType.size === 0
        ? null
        : createEmitEffectValuesMessage({ updates: initialValuesByType });

    const initialValueActions =
      initialValuesMessage != null
        ? [HandlerAction.Send({ target: this.next, message: initialValuesMessage })]
        : [];

    const combinedActions = [...initialValueActions, ...actions];
    return combinedActions.length === 0 ? null : combinedActions;
  }

  private handleUnsubscribeEffects(
    message: UnsubscribeEffectsMessage,
    context: HandlerContext<EffectHandlerInput<TInternal>>,
  ): EffectHandlerOutput<TInternal> {
    const { effects } = message.payload;
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
    values: Map<EffectId, Expression<unknown>>,
  ): HandlerAction<EffectHandlerOutputMessage> {
    const effectValues = new Map([[effectType, values]]);
    const emitMessage = createEmitEffectValuesMessage({ updates: effectValues });
    return HandlerAction.Send({ target: this.next, message: emitMessage });
  }
}
