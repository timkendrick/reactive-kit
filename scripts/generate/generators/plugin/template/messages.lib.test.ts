import { expect, test } from 'vitest';

import * as lib from './messages.lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({});
});
