import { expect, test } from 'vitest';

import * as lib from './utils';

test('module exports', () => {
  expect({ ...lib }).toEqual({});
});
