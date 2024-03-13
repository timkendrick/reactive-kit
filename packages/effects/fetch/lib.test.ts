import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    FetchHandler: lib.FetchHandler,
    fetch: lib.useFetch,
  });
});
