import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    BroadcastActor: lib.BroadcastActor,
    flow: lib.flow,
    FilterActor: lib.FilterActor,
    FlatMapActor: lib.FlatMapActor,
    MapActor: lib.MapActor,
    ScanActor: lib.ScanActor,
    chain: lib.chain,
    fromAsyncIteratorFactory: lib.fromAsyncIteratorFactory,
    fromCancelablePromiseFactory: lib.fromCancelablePromiseFactory,
    fromPromiseFactory: lib.fromPromiseFactory,
    pipe: lib.pipe,
  });
});
