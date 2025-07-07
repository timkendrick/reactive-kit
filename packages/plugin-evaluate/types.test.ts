import { expect, test } from 'vitest';

import * as lib from './types';

test('module exports', () => {
  expect({ ...lib }).toEqual({});
});
