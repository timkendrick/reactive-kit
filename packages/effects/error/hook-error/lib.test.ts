import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    CATCHER_TYPE_ERROR_CATCH: lib.CATCHER_TYPE_ERROR_CATCH,
    useCatch: lib.useCatch,
    useThrow: lib.useThrow,
  });
});
