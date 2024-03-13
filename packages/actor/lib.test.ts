import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    HandlerAction: lib.HandlerAction,
    HandlerActionType: lib.HandlerActionType,
  });
});
