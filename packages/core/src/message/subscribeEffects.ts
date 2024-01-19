import { type Effect, type EffectType, type Message } from '@trigger/types';

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
