import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    ExtendedJsonSerializer: lib.ExtendedJsonSerializer,
    JsonSerializer: lib.JsonSerializer,
  });
});
