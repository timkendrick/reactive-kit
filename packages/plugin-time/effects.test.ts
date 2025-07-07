import { expect, test } from 'vitest';

import * as lib from './effects';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    createTimeEffect: lib.createTimeEffect,
    EFFECT_TYPE_TIME: lib.EFFECT_TYPE_TIME,
    isTimeEffect: lib.isTimeEffect,
  });
});
