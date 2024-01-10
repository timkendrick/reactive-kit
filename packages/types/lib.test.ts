import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    isSignal: lib.isSignal,
    isStateful: lib.isStateful,
    PollStatus: lib.PollStatus,
    SIGNAL: lib.SIGNAL,
    STATEFUL: lib.STATEFUL,
  });
});
