import { type Message, type Reactive, type StateToken } from '@trigger/types';

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
