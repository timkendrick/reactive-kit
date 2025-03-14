import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    ACTOR_TYPE_RUNTIME: lib.ACTOR_TYPE_RUNTIME,
    Runtime: lib.Runtime,
  });
});
