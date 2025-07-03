import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    ACTOR_TYPE_TIME_HANDLER: lib.ACTOR_TYPE_TIME_HANDLER,
    createTimeEffect: lib.createTimeEffect,
    createTimeHandlerEmitMessage: lib.createTimeHandlerEmitMessage,
    EFFECT_TYPE_TIME: lib.EFFECT_TYPE_TIME,
    isTimeEffect: lib.isTimeEffect,
    isTimeHandlerEmitMessage: lib.isTimeHandlerEmitMessage,
    MESSAGE_TIME_HANDLER_EMIT: lib.MESSAGE_TIME_HANDLER_EMIT,
    TASK_TYPE_TIME: lib.TASK_TYPE_TIME,
    TimeHandler: lib.TimeHandler,
    TIME_TASK: lib.TIME_TASK,
    useTime: lib.useTime,
  });
});
