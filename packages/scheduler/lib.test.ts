import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    AsyncScheduler: lib.AsyncScheduler,
    ROOT_ACTOR_TYPE: lib.ROOT_ACTOR_TYPE,
  });
});
