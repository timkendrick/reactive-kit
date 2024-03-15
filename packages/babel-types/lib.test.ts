import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    NODE_FIELDS: lib.NODE_FIELDS,
    VISITOR_KEYS: lib.VISITOR_KEYS,
  });
});
