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
  MESSAGE_SUBSCRIBE_EFFECTS,
  MESSAGE_UNSUBSCRIBE_EFFECTS,
  type EmitEffectValuesMessage,
  type Message,
  type SubscribeEffectsMessage,
  type UnsubscribeEffectsMessage,
} from '@reactive-kit/runtime-messages';
import { createPending, type EffectId, type PendingExpression } from '@reactive-kit/types';
import { nonNull } from '@reactive-kit/utils';
import { EFFECT_TYPE_{{ constantCase pluginName }}, type {{ pascalCase pluginName }}Effect } from '../effects';

export type {{ pascalCase pluginName }}HandlerInputMessage = SubscribeEffectsMessage | UnsubscribeEffectsMessage;
export type {{ pascalCase pluginName }}HandlerOutputMessage = EmitEffectValuesMessage;

type {{ pascalCase pluginName }}HandlerInternalMessage = never;
type {{ pascalCase pluginName }}HandlerInput = {{ pascalCase pluginName }}HandlerInputMessage | {{ pascalCase pluginName }}HandlerInternalMessage;
type {{ pascalCase pluginName }}HandlerOutput = HandlerResult<{{ pascalCase pluginName }}HandlerOutputMessage | {{ pascalCase pluginName }}HandlerInternalMessage>;

export class {{ pascalCase pluginName }}Handler implements Actor<Message<unknown>> {
  private readonly next: ActorHandle<{{ pascalCase pluginName }}HandlerOutputMessage>;

  constructor(next: ActorHandle<{{ pascalCase pluginName }}HandlerOutputMessage>) {
    this.next = next;
  }

  public handle(
    message: Message<unknown>,
    context: HandlerContext<{{ pascalCase pluginName }}HandlerInput>,
  ): {{ pascalCase pluginName }}HandlerOutput {
    if (!this.accept(message)) return null;
    switch (message.type) {
      case MESSAGE_SUBSCRIBE_EFFECTS:
        return this.handleSubscribeEffects(message, context);
      case MESSAGE_UNSUBSCRIBE_EFFECTS:
        return this.handleUnsubscribeEffects(message, context);
    }
  }

  private accept(message: Message<unknown>): message is {{ pascalCase pluginName }}HandlerInput {
    if (isSubscribeEffectsMessage(message)) return message.effects.has(EFFECT_TYPE_{{ constantCase pluginName }});
    if (isUnsubscribeEffectsMessage(message)) return message.effects.has(EFFECT_TYPE_{{ constantCase pluginName }});
    return false;
  }

  private handleSubscribeEffects(
    message: SubscribeEffectsMessage,
    context: HandlerContext<{{ pascalCase pluginName }}HandlerInput>,
  ): {{ pascalCase pluginName }}HandlerOutput {
    const { effects } = message;
    const typedEffects = getTypedEffects<{{ pascalCase pluginName }}Effect>(EFFECT_TYPE_{{ constantCase pluginName }}, effects);
    if (!typedEffects || typedEffects.length === 0) return null;
    const self = context.self();
    const pendingValues = new Map(
      typedEffects
        .map((effect): [EffectId, PendingExpression] | null => {
          const stateToken = effect.id;
          return [stateToken, createPending()];
        })
        .filter(nonNull),
    );
    const actions = typedEffects
      .map((effect) => {
        return null;
      })
      .filter(nonNull);
    const pendingPlaceholdersMessage =
      pendingValues.size === 0
        ? null
        : createEmitEffectValuesMessage(new Map([[EFFECT_TYPE_{{ constantCase pluginName }}, pendingValues]]));
    const pendingPlaceholderActions =
      pendingPlaceholdersMessage != null
        ? [HandlerAction.Send(this.next, pendingPlaceholdersMessage)]
        : [];
    const combinedActions = [...pendingPlaceholderActions, ...actions];
    return combinedActions.length === 0 ? null : combinedActions;
  }

  private handleUnsubscribeEffects(
    message: UnsubscribeEffectsMessage,
    context: HandlerContext<{{ pascalCase pluginName }}HandlerInput>,
  ): {{ pascalCase pluginName }}HandlerOutput {
    const { effects } = message;
    const typedEffects = getTypedEffects<{{ pascalCase pluginName }}Effect>(EFFECT_TYPE_{{ constantCase pluginName }}, effects);
    if (!typedEffects || typedEffects.length === 0) return null;
    const actions = typedEffects
      .map((effect) => {
        return null;
      })
      .filter(nonNull);
    if (actions.length === 0) return null;
    return actions;
  }
}
