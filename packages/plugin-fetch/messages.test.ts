import { expect, test } from 'vitest';

import * as lib from './messages';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    createFetchHandlerResponseMessage: lib.createFetchHandlerResponseMessage,
    isFetchHandlerResponseMessage: lib.isFetchHandlerResponseMessage,
    MESSAGE_FETCH_HANDLER_RESPONSE: lib.MESSAGE_FETCH_HANDLER_RESPONSE,
  });
});
