import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    createTimeEffect: lib.createTimeEffect,
    createTimeHandlerEmitMessage: lib.createTimeHandlerEmitMessage,
    EFFECT_TYPE_TIME: lib.EFFECT_TYPE_TIME,
    isTimeEffect: lib.isTimeEffect,
    isTimeHandlerEmitMessage: lib.isTimeHandlerEmitMessage,
    MESSAGE_TIME_HANDLER_EMIT: lib.MESSAGE_TIME_HANDLER_EMIT,
    TimeHandler: lib.TimeHandler,
    useTime: lib.useTime,
  });
});
