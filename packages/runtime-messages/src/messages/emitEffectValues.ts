import type { EffectType, EffectId, Expression } from '@reactive-kit/types';
import type { Message } from '../message';

export const MESSAGE_EMIT_EFFECT_VALUES = 'core::emitEffectValues';

export interface EmitEffectValuesMessage extends Message<typeof MESSAGE_EMIT_EFFECT_VALUES> {
  updates: Map<EffectType, Map<EffectId, Expression<any>>>;
}

export function createEmitEffectValuesMessage(
  updates: Map<EffectType, Map<EffectId, Expression<any>>>,
): EmitEffectValuesMessage {
  return {
    type: MESSAGE_EMIT_EFFECT_VALUES,
    updates,
  };
}

export function isEmitEffectValuesMessage(
  message: Message<unknown>,
): message is EmitEffectValuesMessage {
  return message.type === MESSAGE_EMIT_EFFECT_VALUES;
}
