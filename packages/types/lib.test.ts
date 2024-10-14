import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    createEffect: lib.createEffect,
    createSignal: lib.createSignal,
    createStateful: lib.createStateful,
    EFFECT: lib.EFFECT,
    isEffect: lib.isEffect,
    isSignal: lib.isSignal,
    isStateful: lib.isStateful,
    SIGNAL: lib.SIGNAL,
  });
});
