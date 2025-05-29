import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    ACTOR_HANDLE_TYPE: lib.ACTOR_HANDLE_TYPE,
    HandlerAction: lib.HandlerAction,
    HandlerActionType: lib.HandlerActionType,
    isActorHandle: lib.isActorHandle,
  });
});
