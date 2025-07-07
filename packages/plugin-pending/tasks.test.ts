import { expect, test } from 'vitest';

import * as lib from './tasks';

test('module exports', () => {
  expect({ ...lib }).toEqual({});
});
