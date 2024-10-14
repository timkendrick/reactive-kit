import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    EFFECT_TYPE_GET_STATE: lib.EFFECT_TYPE_GET_STATE,
    EFFECT_TYPE_SET_STATE: lib.EFFECT_TYPE_SET_STATE,
    EFFECT_TYPE_STATE: lib.EFFECT_TYPE_STATE,
    createGetStateEffect: lib.createGetStateEffect,
    createSetStateEffect: lib.createSetStateEffect,
    createStateEffect: lib.createStateEffect,
    isGetStateEffect: lib.isGetStateEffect,
    isSetStateEffect: lib.isSetStateEffect,
    isStateEffect: lib.isStateEffect,
  });
});
