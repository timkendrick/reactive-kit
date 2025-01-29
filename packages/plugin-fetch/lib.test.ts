import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    createFetchEffect: lib.createFetchEffect,
    createFetchHandlerResponseMessage: lib.createFetchHandlerResponseMessage,
    EFFECT_TYPE_FETCH: lib.EFFECT_TYPE_FETCH,
    FetchHandler: lib.FetchHandler,
    isFetchEffect: lib.isFetchEffect,
    isFetchHandlerResponseMessage: lib.isFetchHandlerResponseMessage,
    MESSAGE_FETCH_HANDLER_RESPONSE: lib.MESSAGE_FETCH_HANDLER_RESPONSE,
    useFetch: lib.useFetch,
  });
});
