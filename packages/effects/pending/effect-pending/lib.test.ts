import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    EFFECT_TYPE_PENDING: lib.EFFECT_TYPE_PENDING,
    createPendingEffect: lib.createPendingEffect,
  });
});
