import type { EmitEffectValuesMessage } from './EmitEffectValuesMessage';
import type { SubscribeEffectsMessage } from './SubscribeEffectsMessage';
import type { UnsubscribeEffectsMessage } from './UnsubscribeEffectsMessage';

export type RuntimeMessage =
  | EmitEffectValuesMessage
  | SubscribeEffectsMessage
  | UnsubscribeEffectsMessage;
