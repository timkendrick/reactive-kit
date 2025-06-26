import type { EffectId, EffectType, Expression } from '@reactive-kit/types';

import type { Message } from '../message';

export const MESSAGE_EMIT_EFFECT_VALUES = 'core::emitEffectValues';

export interface EmitEffectValuesMessagePayload {
  updates: Map<EffectType, Map<EffectId, Expression<unknown>>>;
}

export type EmitEffectValuesMessage = Message<
  typeof MESSAGE_EMIT_EFFECT_VALUES,
  EmitEffectValuesMessagePayload
>;

export function createEmitEffectValuesMessage(
  payload: EmitEffectValuesMessagePayload,
): EmitEffectValuesMessage {
  return {
    type: MESSAGE_EMIT_EFFECT_VALUES,
    payload,
  };
}

export function isEmitEffectValuesMessage(
  message: Message<unknown, unknown>,
): message is EmitEffectValuesMessage {
  return message.type === MESSAGE_EMIT_EFFECT_VALUES;
}
