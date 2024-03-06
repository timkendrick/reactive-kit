import { type Effect, type EffectType } from '@trigger/types';
import { type Message } from './message';

export const MESSAGE_SUBSCRIBE_EFFECTS = 'core::subscribeEffects';

export interface SubscribeEffectsMessage extends Message<typeof MESSAGE_SUBSCRIBE_EFFECTS> {
  effects: Map<EffectType, Array<Effect>>;
}

export function createSubscribeEffectsMessage(
  effects: Map<EffectType, Array<Effect>>,
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
