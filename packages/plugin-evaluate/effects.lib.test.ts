import { expect, test } from 'vitest';

import * as lib from './effects.lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    createEvaluateEffect: lib.createEvaluateEffect,
    EFFECT_TYPE_EVALUATE: lib.EFFECT_TYPE_EVALUATE,
    isEvaluateEffect: lib.isEvaluateEffect,
  });
});
