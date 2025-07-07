import { expect, test } from 'vitest';

import * as lib from './hooks';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    useFallback: lib.useFallback,
    usePending: lib.usePending,
  });
});
