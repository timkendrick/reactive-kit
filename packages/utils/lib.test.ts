import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    AsyncQueue: lib.AsyncQueue,
    createHasher: lib.createHasher,
    Enum: lib.Enum,
    enumConstructor: lib.enumConstructor,
    enumVariantConstructor: lib.enumVariantConstructor,
    hash: lib.hash,
    HASH: lib.HASH,
    hashSeed: lib.hashSeed,
    instantiateEnum: lib.instantiateEnum,
    isEnumVariant: lib.isEnumVariant,
    isGenerator: lib.isGenerator,
    isGeneratorFunction: lib.isGeneratorFunction,
    match: lib.match,
    nonNull: lib.nonNull,
    noop: lib.noop,
    PhantomType: lib.PhantomType,
    subscribeAsyncIterator: lib.subscribeAsyncIterator,
    unreachable: lib.unreachable,
    VARIANT: lib.VARIANT,
    writeArrayHash: lib.writeArrayHash,
    writeBigintHash: lib.writeBigintHash,
    writeBooleanHash: lib.writeBooleanHash,
    writeByteHash: lib.writeByteHash,
    writeNullHash: lib.writeNullHash,
    writeNumberHash: lib.writeNumberHash,
    writeObjectHash: lib.writeObjectHash,
    writeStringHash: lib.writeStringHash,
    writeUint8ArrayHash: lib.writeUint8ArrayHash,
    writeUndefinedHash: lib.writeUndefinedHash,
    writeValueHash: lib.writeValueHash,
  });
});
