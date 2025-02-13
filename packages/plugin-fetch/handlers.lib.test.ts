import { expect, test } from 'vitest';

import * as lib from './handlers.lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    createFetchHandlerResponseMessage: lib.createFetchHandlerResponseMessage,
    FetchHandler: lib.FetchHandler,
    isFetchHandlerResponseMessage: lib.isFetchHandlerResponseMessage,
    MESSAGE_FETCH_HANDLER_RESPONSE: lib.MESSAGE_FETCH_HANDLER_RESPONSE,
  });
});
