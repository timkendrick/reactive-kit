import { expect, test } from 'vitest';

import * as lib from './messages';

test('module exports', () => {
  expect({ ...lib }).toEqual({});
});
