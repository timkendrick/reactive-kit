import { expect, test } from 'vitest';

import * as lib from './messages';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    createTimeHandlerEmitMessage: lib.createTimeHandlerEmitMessage,
    isTimeHandlerEmitMessage: lib.isTimeHandlerEmitMessage,
    MESSAGE_TIME_HANDLER_EMIT: lib.MESSAGE_TIME_HANDLER_EMIT,
  });
});
