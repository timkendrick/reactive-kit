import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    ASYNC_TASK_COMMAND_TYPE_DELAY: lib.ASYNC_TASK_COMMAND_TYPE_DELAY,
    ASYNC_TASK_COMMAND_TYPE_KILL: lib.ASYNC_TASK_COMMAND_TYPE_KILL,
    ASYNC_TASK_COMMAND_TYPE_SEND: lib.ASYNC_TASK_COMMAND_TYPE_SEND,
    TASK_TYPE_ACT: lib.TASK_TYPE_ACT,
    act: lib.act,
    delay: lib.delay,
    kill: lib.kill,
    send: lib.send,
  });
});
