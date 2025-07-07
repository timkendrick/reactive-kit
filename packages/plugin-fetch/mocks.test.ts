import { expect, test } from 'vitest';

import * as lib from './mocks';

test('module exports', () => {
  expect({ ...lib }).toEqual({});
});
