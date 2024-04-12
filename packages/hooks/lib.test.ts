import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    useEvaluate: lib.useEvaluate,
    useFetch: lib.useFetch,
    useGetState: lib.useGetState,
    usePending: lib.usePending,
    useSetState: lib.useSetState,
    useState: lib.useState,
    useTime: lib.useTime,
  });
});
