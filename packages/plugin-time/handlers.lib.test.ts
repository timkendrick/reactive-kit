import { expect, test } from 'vitest';

import * as lib from './handlers.lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    TimeHandler: lib.TimeHandler,
  });
});
