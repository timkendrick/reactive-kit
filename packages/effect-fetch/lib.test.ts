import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    EFFECT_TYPE_FETCH: lib.EFFECT_TYPE_FETCH,
    createFetchEffect: lib.createFetchEffect,
    useFetch: lib.useFetch,
  });
});
