import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    CATCHER_TYPE_PENDING_FALLBACK: lib.CATCHER_TYPE_PENDING_FALLBACK,
    useFallback: lib.useFallback,
    usePending: lib.usePending,
  });
});
