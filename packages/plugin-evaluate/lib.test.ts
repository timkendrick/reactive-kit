import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    ACTOR_TYPE_EVALUATE_HANDLER: lib.ACTOR_TYPE_EVALUATE_HANDLER,
    createEvaluateEffect: lib.createEvaluateEffect,
    EFFECT_TYPE_EVALUATE: lib.EFFECT_TYPE_EVALUATE,
    EvaluateHandler: lib.EvaluateHandler,
    isEvaluateEffect: lib.isEvaluateEffect,
    useEvaluate: lib.useEvaluate,
  });
});
