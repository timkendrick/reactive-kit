import {
  EmitEffectValuesMessage,
  SubscribeEffectsMessage,
  UnsubscribeEffectsMessage,
} from './messages';

export interface Message<T> {
  type: T;
}

export type RuntimeMessage =
  | EmitEffectValuesMessage
  | SubscribeEffectsMessage
  | UnsubscribeEffectsMessage;
