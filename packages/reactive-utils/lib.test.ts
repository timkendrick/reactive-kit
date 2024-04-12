import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    map: lib.map,
    useReactive: lib.useReactive,
  });
});
