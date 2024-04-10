import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    EFFECT_TYPE_TIME: lib.EFFECT_TYPE_TIME,
    createTimeEffect: lib.createTimeEffect,
    useTime: lib.useTime,
  });
});
