import { type StateToken } from '@reactive-kit/effect';
import { type Reactive } from '@reactive-kit/interpreter';
import { type Message } from '../message';

export const MESSAGE_EMIT_EFFECT_VALUES = 'core::emitEffectValues';

export interface EmitEffectValuesMessage extends Message<typeof MESSAGE_EMIT_EFFECT_VALUES> {
  values: Map<StateToken, Reactive<any>>;
}

export function createEmitEffectValuesMessage(
  values: Map<StateToken, Reactive<any>>,
): EmitEffectValuesMessage {
  return {
    type: MESSAGE_EMIT_EFFECT_VALUES,
    values,
  };
}

export function isEmitEffectValuesMessage(
  message: Message<unknown>,
): message is EmitEffectValuesMessage {
  return message.type === MESSAGE_EMIT_EFFECT_VALUES;
}
