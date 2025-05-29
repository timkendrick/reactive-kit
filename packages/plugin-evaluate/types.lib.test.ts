import { expect, test } from 'vitest';

import * as lib from './types.lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    isMessage: lib.isMessage,
  });
});
