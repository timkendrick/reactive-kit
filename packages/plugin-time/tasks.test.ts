import { expect, test } from 'vitest';

import * as lib from './tasks';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    TIME_TASK: lib.TIME_TASK,
    TASK_TYPE_TIME: lib.TASK_TYPE_TIME,
  });
});
