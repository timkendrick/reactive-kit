import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    AsyncScheduler: lib.AsyncScheduler,
    AsyncSchedulerActorHandle: lib.AsyncSchedulerActorHandle,
    AsyncSchedulerCommand: lib.AsyncSchedulerCommand,
    AsyncSchedulerCommandType: lib.AsyncSchedulerCommandType,
    ROOT_ACTOR_TYPE: lib.ROOT_ACTOR_TYPE,
  });
});
