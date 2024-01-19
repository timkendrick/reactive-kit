import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    createEffect: lib.createEffect,
    hash: lib.hash,
    never: lib.never,
    once: lib.variable,
  });
});
