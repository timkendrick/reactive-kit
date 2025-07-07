import { expect, test } from 'vitest';

import * as lib from './tasks';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    FETCH_TASK: lib.FETCH_TASK,
    TASK_TYPE_FETCH: lib.TASK_TYPE_FETCH,
  });
});
