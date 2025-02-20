import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    AsyncTaskHandler: lib.AsyncTaskHandler,
    EffectHandler: lib.EffectHandler,
  });
});
