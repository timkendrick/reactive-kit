import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    MESSAGE_EMIT_EFFECT_VALUES: lib.MESSAGE_EMIT_EFFECT_VALUES,
    MESSAGE_SUBSCRIBE_EFFECTS: lib.MESSAGE_SUBSCRIBE_EFFECTS,
    MESSAGE_UNSUBSCRIBE_EFFECTS: lib.MESSAGE_UNSUBSCRIBE_EFFECTS,
    createEmitEffectValuesMessage: lib.createEmitEffectValuesMessage,
    createSubscribeEffectsMessage: lib.createSubscribeEffectsMessage,
    createUnsubscribeEffectsMessage: lib.createUnsubscribeEffectsMessage,
    isEmitEffectValuesMessage: lib.isEmitEffectValuesMessage,
    isSubscribeEffectsMessage: lib.isSubscribeEffectsMessage,
    isUnsubscribeEffectsMessage: lib.isUnsubscribeEffectsMessage,
  });
});
