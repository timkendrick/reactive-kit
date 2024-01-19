import { type Effect, type EffectType, type Message } from '@trigger/types';

export const MESSAGE_UNSUBSCRIBE_EFFECTS = 'core::unsubscribeEffects';

export interface UnsubscribeEffectsMessage extends Message<typeof MESSAGE_UNSUBSCRIBE_EFFECTS> {
  effects: Map<EffectType, Array<Effect>>;
}

export function createUnsubscribeEffectsMessage(
  effects: Map<EffectType, Array<Effect>>,
): UnsubscribeEffectsMessage {
  return {
    type: MESSAGE_UNSUBSCRIBE_EFFECTS,
    effects,
  };
}
