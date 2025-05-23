import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    AsyncQueue: lib.AsyncQueue,
    Enum: lib.Enum,
    createAsyncTrigger: lib.createAsyncTrigger,
    enumConstructor: lib.enumConstructor,
    enumVariantConstructor: lib.enumVariantConstructor,
    instantiateEnum: lib.instantiateEnum,
    isEnumVariant: lib.isEnumVariant,
    isGenerator: lib.isGenerator,
    isGeneratorFunction: lib.isGeneratorFunction,
    isNonEmptyArray: lib.isNonEmptyArray,
    match: lib.match,
    nonNull: lib.nonNull,
    noop: lib.noop,
    partition: lib.partition,
    PhantomType: lib.PhantomType,
    subscribeAsyncIterator: lib.subscribeAsyncIterator,
    generateUid: lib.generateUid,
    unreachable: lib.unreachable,
    VARIANT: lib.VARIANT,
  });
});
