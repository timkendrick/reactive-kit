import { expect, test } from 'vitest';

import * as lib from './effects';

test('module exports', () => {
  expect({ ...lib }).toEqual({});
});
