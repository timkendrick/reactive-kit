import { expect, test } from 'vitest';

import * as lib from './handlers';

test('module exports', () => {
  expect({ ...lib }).toEqual({});
});
