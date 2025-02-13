import { expect, test } from 'vitest';

import * as lib from './effects.lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    createFetchEffect: lib.createFetchEffect,
    EFFECT_TYPE_FETCH: lib.EFFECT_TYPE_FETCH,
    isFetchEffect: lib.isFetchEffect,
  });
});
