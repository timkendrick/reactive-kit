import { expect, test } from 'vitest';

import * as lib from './hooks.lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    useTime: lib.useTime,
  });
});
