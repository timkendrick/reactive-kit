import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    EFFECT_TYPE_NEVER: lib.EFFECT_TYPE_NEVER,
    createNeverEffect: lib.createNeverEffect,
  });
});
