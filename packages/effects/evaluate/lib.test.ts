import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    EFFECT_TYPE_EVALUATE: lib.EFFECT_TYPE_EVALUATE,
    EFFECT_TYPE_NEVER: lib.EFFECT_TYPE_NEVER,
    EFFECT_TYPE_VARIABLE_GET: lib.EFFECT_TYPE_GET_STATE,
    EFFECT_TYPE_VARIABLE_SET: lib.EFFECT_TYPE_SET_STATE,
    EvaluateHandler: lib.EvaluateHandler,
    evaluate: lib.useEvaluate,
    getVariable: lib.useGetState,
    never: lib.useNever,
    setVariable: lib.useSetState,
    variable: lib.useState,
  });
});
