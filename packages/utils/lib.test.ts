import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    Enum: lib.Enum,
    VARIANT: lib.VARIANT,
    enumConstructor: lib.enumConstructor,
    enumVariantConstructor: lib.enumVariantConstructor,
    instantiateEnum: lib.instantiateEnum,
    isEnumVariant: lib.isEnumVariant,
    isGenerator: lib.isGenerator,
    isGeneratorFunction: lib.isGeneratorFunction,
    match: lib.match,
    nonNull: lib.nonNull,
    noop: lib.noop,
    PhantomType: lib.PhantomType,
    unreachable: lib.unreachable,
  });
});
