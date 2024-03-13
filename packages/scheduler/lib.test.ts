import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    AsyncScheduler: lib.AsyncScheduler,
    MaybeAsyncActor: lib.MaybeAsyncActor,
  });
});
