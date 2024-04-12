import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    createEffect: lib.createEffect,
    createStateful: lib.createStateful,
    EFFECT: lib.EFFECT,
    isEffect: lib.isEffect,
    isStateful: lib.isStateful,
  });
});
