import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    resolve: lib.resolve,
    load: lib.load,
  });
});
