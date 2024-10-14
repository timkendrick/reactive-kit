import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    EFFECT_TYPE_EVALUATE: lib.EFFECT_TYPE_EVALUATE,
    createEvaluateEffect: lib.createEvaluateEffect,
    isEvaluateEffect: lib.isEvaluateEffect,
  });
});
