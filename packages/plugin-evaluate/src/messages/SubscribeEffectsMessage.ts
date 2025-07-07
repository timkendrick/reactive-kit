import type { Message } from '@reactive-kit/message';
import type { EffectExpression, EffectType } from '@reactive-kit/types';

export const MESSAGE_SUBSCRIBE_EFFECTS = 'core::subscribeEffects';

export interface SubscribeEffectsMessagePayload {
  effects: Map<EffectType, Array<EffectExpression<unknown>>>;
}

export type SubscribeEffectsMessage = Message<
  typeof MESSAGE_SUBSCRIBE_EFFECTS,
  SubscribeEffectsMessagePayload
>;

export function createSubscribeEffectsMessage(
  payload: SubscribeEffectsMessagePayload,
): SubscribeEffectsMessage {
  return {
    type: MESSAGE_SUBSCRIBE_EFFECTS,
    payload,
  };
}

export function isSubscribeEffectsMessage(
  message: Message<unknown, unknown>,
): message is SubscribeEffectsMessage {
  return message.type === MESSAGE_SUBSCRIBE_EFFECTS;
}
