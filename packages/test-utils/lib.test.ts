import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    and: lib.and,
    any: lib.any,
    equals: lib.equals,
    hasActionType: lib.hasActionType,
    hasField: lib.hasField,
    hasMessagePayload: lib.hasMessagePayload,
    hasMessageType: lib.hasMessageType,
    is: lib.is,
    initialMatchState: lib.initialMatchState,
    lazy: lib.lazy,
    matchPattern: lib.matchPattern,
    not: lib.not,
    oneOf: lib.oneOf,
    oneOrMore: lib.oneOrMore,
    or: lib.or,
    parallel: lib.parallel,
    predicate: lib.predicate,
    repeat: lib.repeat,
    sentFrom: lib.sentFrom,
    sentTo: lib.sentTo,
    sequence: lib.sequence,
    withRefs: lib.withRefs,
    zeroOrMore: lib.zeroOrMore,
  });
});
