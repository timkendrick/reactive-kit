import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    CATCHER_TYPE_PENDING_FALLBACK: lib.CATCHER_TYPE_PENDING_FALLBACK,
    useEvaluate: lib.useEvaluate,
    useFallback: lib.useFallback,
    useFetch: lib.useFetch,
    useGetState: lib.useGetState,
    usePending: lib.usePending,
    useSetState: lib.useSetState,
    useState: lib.useState,
    useTime: lib.useTime,
  });
});
