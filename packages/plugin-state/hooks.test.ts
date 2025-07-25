import { expect, test } from 'vitest';

import * as lib from './hooks';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    useGetState: lib.useGetState,
    useSetState: lib.useSetState,
    useState: lib.useState,
  });
});
