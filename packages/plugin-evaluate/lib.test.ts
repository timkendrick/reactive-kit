import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    ACTOR_TYPE_EVALUATE_HANDLER: lib.ACTOR_TYPE_EVALUATE_HANDLER,
    createEmitEffectValuesMessage: lib.createEmitEffectValuesMessage,
    createEvaluateEffect: lib.createEvaluateEffect,
    createSubscribeEffectsMessage: lib.createSubscribeEffectsMessage,
    createUnsubscribeEffectsMessage: lib.createUnsubscribeEffectsMessage,
    EFFECT_TYPE_EVALUATE: lib.EFFECT_TYPE_EVALUATE,
    EvaluateHandler: lib.EvaluateHandler,
    getTypedEffects: lib.getTypedEffects,
    groupEffectsByType: lib.groupEffectsByType,
    isEmitEffectValuesMessage: lib.isEmitEffectValuesMessage,
    isEvaluateEffect: lib.isEvaluateEffect,
    isSubscribeEffectsMessage: lib.isSubscribeEffectsMessage,
    isUnsubscribeEffectsMessage: lib.isUnsubscribeEffectsMessage,
    MESSAGE_EMIT_EFFECT_VALUES: lib.MESSAGE_EMIT_EFFECT_VALUES,
    MESSAGE_SUBSCRIBE_EFFECTS: lib.MESSAGE_SUBSCRIBE_EFFECTS,
    MESSAGE_UNSUBSCRIBE_EFFECTS: lib.MESSAGE_UNSUBSCRIBE_EFFECTS,
    useEvaluate: lib.useEvaluate,
  });
});
