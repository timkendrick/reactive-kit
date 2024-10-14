import { type Effect, type EffectType } from '@reactive-kit/types';
import { type Message } from '../message';

export const MESSAGE_SUBSCRIBE_EFFECTS = 'core::subscribeEffects';

export interface SubscribeEffectsMessage extends Message<typeof MESSAGE_SUBSCRIBE_EFFECTS> {
  effects: Map<EffectType, Array<Effect<unknown>>>;
}

export function createSubscribeEffectsMessage(
  effects: Map<EffectType, Array<Effect<unknown>>>,
): SubscribeEffectsMessage {
  return {
    type: MESSAGE_SUBSCRIBE_EFFECTS,
    effects,
  };
}

export function isSubscribeEffectsMessage(
  message: Message<unknown>,
): message is SubscribeEffectsMessage {
  return message.type === MESSAGE_SUBSCRIBE_EFFECTS;
}
