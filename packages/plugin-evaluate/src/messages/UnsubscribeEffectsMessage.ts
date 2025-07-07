import type { Message } from '@reactive-kit/message';
import type { EffectExpression, EffectType } from '@reactive-kit/types';

export const MESSAGE_UNSUBSCRIBE_EFFECTS = 'core::unsubscribeEffects';

export interface UnsubscribeEffectsMessagePayload {
  effects: Map<EffectType, Array<EffectExpression<unknown>>>;
}

export type UnsubscribeEffectsMessage = Message<
  typeof MESSAGE_UNSUBSCRIBE_EFFECTS,
  UnsubscribeEffectsMessagePayload
>;

export function createUnsubscribeEffectsMessage(
  payload: UnsubscribeEffectsMessagePayload,
): UnsubscribeEffectsMessage {
  return {
    type: MESSAGE_UNSUBSCRIBE_EFFECTS,
    payload,
  };
}

export function isUnsubscribeEffectsMessage(
  message: Message<unknown, unknown>,
): message is UnsubscribeEffectsMessage {
  return message.type === MESSAGE_UNSUBSCRIBE_EFFECTS;
}
