import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    AsyncQueue: lib.AsyncQueue,
    Enum: lib.Enum,
    createAsyncTrigger: lib.createAsyncTrigger,
    deepEqual: lib.deepEqual,
    isNonEmptyArray: lib.isNonEmptyArray,
    nonNull: lib.nonNull,
    noop: lib.noop,
    partition: lib.partition,
    subscribeAsyncIterator: lib.subscribeAsyncIterator,
    generateUid: lib.generateUid,
    unreachable: lib.unreachable,
    VARIANT: lib.VARIANT,
  });
});
