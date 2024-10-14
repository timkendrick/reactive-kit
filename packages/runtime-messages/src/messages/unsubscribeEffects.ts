import { type Effect, type EffectType } from '@reactive-kit/types';
import { type Message } from '../message';

export const MESSAGE_UNSUBSCRIBE_EFFECTS = 'core::unsubscribeEffects';

export interface UnsubscribeEffectsMessage extends Message<typeof MESSAGE_UNSUBSCRIBE_EFFECTS> {
  effects: Map<EffectType, Array<Effect<unknown>>>;
}

export function createUnsubscribeEffectsMessage(
  effects: Map<EffectType, Array<Effect<unknown>>>,
): UnsubscribeEffectsMessage {
  return {
    type: MESSAGE_UNSUBSCRIBE_EFFECTS,
    effects,
  };
}

export function isUnsubscribeEffectsMessage(
  message: Message<unknown>,
): message is UnsubscribeEffectsMessage {
  return message.type === MESSAGE_UNSUBSCRIBE_EFFECTS;
}
