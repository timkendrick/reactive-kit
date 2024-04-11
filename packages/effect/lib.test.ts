import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    createEffect: lib.createEffect,
    createEffectHook: lib.createEffectHook,
    EFFECT: lib.EFFECT,
    getTypedEffects: lib.getTypedEffects,
    groupEffectsByType: lib.groupEffectsByType,
    isEffect: lib.isEffect,
    transformEffectResult: lib.transformEffectResult,
    transformHookResult: lib.transformHookResult,
  });
});
