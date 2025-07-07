import { expect, test } from 'vitest';

import * as lib from './middleware';

test('module exports', () => {
  expect({ ...lib }).toEqual({});
});
