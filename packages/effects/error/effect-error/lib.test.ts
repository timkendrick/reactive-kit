import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    EFFECT_TYPE_ERROR: lib.EFFECT_TYPE_ERROR,
    createErrorEffect: lib.createErrorEffect,
    isErrorEffect: lib.isErrorEffect,
    ReactiveError: lib.ReactiveError,
  });
});
