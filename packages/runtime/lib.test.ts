import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    ACTOR_HANDLE_TYPE: lib.ACTOR_HANDLE_TYPE,
    ACTOR_TYPE_RUNTIME: lib.ACTOR_TYPE_RUNTIME,
    HandlerAction: lib.HandlerAction,
    HandlerActionType: lib.HandlerActionType,
    isActorHandle: lib.isActorHandle,
    Runtime: lib.Runtime,
  });
});
