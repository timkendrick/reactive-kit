import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    ACTOR_TYPE_FETCH_HANDLER: lib.ACTOR_TYPE_FETCH_HANDLER,
    createFetchEffect: lib.createFetchEffect,
    createFetchHandlerResponseMessage: lib.createFetchHandlerResponseMessage,
    EFFECT_TYPE_FETCH: lib.EFFECT_TYPE_FETCH,
    FETCH_TASK: lib.FETCH_TASK,
    FetchHandler: lib.FetchHandler,
    isFetchEffect: lib.isFetchEffect,
    isFetchHandlerResponseMessage: lib.isFetchHandlerResponseMessage,
    MESSAGE_FETCH_HANDLER_RESPONSE: lib.MESSAGE_FETCH_HANDLER_RESPONSE,
    TASK_TYPE_FETCH: lib.TASK_TYPE_FETCH,
    useFetch: lib.useFetch,
  });
});
