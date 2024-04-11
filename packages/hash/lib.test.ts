import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    assignCustomHash: lib.assignCustomHash,
    createHasher: lib.createHasher,
    hash: lib.hash,
    HASH: lib.HASH,
    hashSeed: lib.hashSeed,
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
