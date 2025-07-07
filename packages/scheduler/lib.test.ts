import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    AsyncScheduler: lib.AsyncScheduler,
    AsyncSchedulerActorHandle: lib.AsyncSchedulerActorHandle,
    SchedulerCommand: lib.SchedulerCommand,
    SchedulerCommandType: lib.SchedulerCommandType,
    IdentitySchedulerMiddlewareActor: lib.IdentitySchedulerMiddlewareActor,
    ChainSchedulerMiddlewareActor: lib.ChainSchedulerMiddlewareActor,
    chainMiddleware: lib.chainMiddleware,
    createSchedulerCommandMessage: lib.createSchedulerCommandMessage,
    composeMiddleware: lib.composeMiddleware,
    identityMiddleware: lib.identityMiddleware,
    isSchedulerCommandMessage: lib.isSchedulerCommandMessage,
    MESSAGE_SCHEDULER_COMMAND: lib.MESSAGE_SCHEDULER_COMMAND,
  });
});
