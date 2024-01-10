import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    createSignal: lib.createSignal,
    createStateful: lib.createStateful,
    hash: lib.hash,
    never: lib.never,
    once: lib.once,
  });
});
